import { API_BASE_URL, getAccessToken } from "./api";

export type VoiceChatEvent =
  | { type: "session.created" }
  | { type: "user.speech_started" }
  | { type: "user.speech_stopped" }
  | { type: "assistant.transcript_delta"; delta: string }
  | { type: "assistant.transcript_complete"; transcript: string }
  | { type: "error"; message: string };

export interface VoiceChatOptions {
  /** Called for high-level events (session, speech, transcript, errors) */
  onEvent?: (event: VoiceChatEvent) => void;
}

/**
 * Optimized client for the /api/chat/voice-realtime WebSocket endpoint.
 *
 * Performance optimizations:
 * - Uses AudioWorklet (off-main-thread) instead of deprecated ScriptProcessorNode
 * - Optimized base64 encoding using chunked String.fromCharCode.apply
 * - Falls back to ScriptProcessorNode for older browsers
 * - Smooth audio playback with buffering and crossfade
 *
 * It follows VOICE_CHAT_GUIDE.md:
 * - connects with JWT token as query param
 * - streams PCM16 base64 audio using input_audio_buffer.append
 * - commits buffer and requests a response on stop
 */
export class VoiceChatRealtimeClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private legacyProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private isRecording = false;
  private options: VoiceChatOptions;
  private assistantTranscript = "";
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private useWorklet = false;
  private workletReady = false;

  // Audio playback buffering for smooth output
  private audioQueue: Int16Array[] = [];
  private isPlaying = false;
  private gainNode: GainNode | null = null;
  private readonly BUFFER_THRESHOLD = 3; // Buffer this many chunks before starting playback
  private readonly OVERLAP_SAMPLES = 64; // Samples to crossfade between chunks

  constructor(options: VoiceChatOptions = {}) {
    this.options = options;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get recording() {
    return this.isRecording;
  }

  async connect() {
    if (this.connected) return;

    const token = getAccessToken();
    if (!token) {
      this.emit({ type: "error", message: "You are not authenticated" });
      return;
    }

    const wsBase = API_BASE_URL.replace(/^http/, "ws");
    const url = `${wsBase}/api/chat/voice-realtime?token=${encodeURIComponent(
      token,
    )}`;

    return new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleServerMessage(event.data);
        };

        this.ws.onerror = (event) => {
          console.error("Voice WS error", event);
          this.emit({ type: "error", message: "Voice connection error" });
        };

        this.ws.onclose = () => {
          this.cleanupAudio();
        };
      } catch (error) {
        console.error("Failed to open voice WebSocket", error);
        this.emit({
          type: "error",
          message: "Failed to connect to voice server",
        });
        reject(error);
      }
    });
  }

  /**
   * Initialize AudioWorklet if supported, otherwise fall back to ScriptProcessorNode.
   */
  private async initAudioWorklet(ctx: AudioContext): Promise<boolean> {
    if (this.workletReady) return true;

    // Check if AudioWorklet is supported
    if (!ctx.audioWorklet) {
      console.log(
        "AudioWorklet not supported, using legacy ScriptProcessorNode",
      );
      return false;
    }

    try {
      await ctx.audioWorklet.addModule("/audio-processor.js");
      this.workletReady = true;
      this.useWorklet = true;
      console.log("AudioWorklet initialized successfully");
      return true;
    } catch (error) {
      console.warn(
        "Failed to load AudioWorklet, falling back to ScriptProcessorNode:",
        error,
      );
      return false;
    }
  }

  async startRecording() {
    if (!this.connected) {
      await this.connect();
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emit({ type: "error", message: "Voice server is not connected" });
      return;
    }

    if (this.isRecording) return;

    try {
      const ctx = this.ensureAudioContext();
      if (!ctx) {
        return;
      }

      // Try to use AudioWorklet, fall back to ScriptProcessorNode
      await this.initAudioWorklet(ctx);

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      this.sourceNode = ctx.createMediaStreamSource(this.mediaStream);

      if (this.useWorklet && this.workletReady) {
        // Use modern AudioWorklet (off-main-thread processing)
        this.workletNode = new AudioWorkletNode(ctx, "voice-chat-processor");

        this.workletNode.port.onmessage = (event) => {
          if (
            !this.isRecording ||
            !this.ws ||
            this.ws.readyState !== WebSocket.OPEN
          )
            return;

          if (event.data.type === "audio") {
            const pcm16 = event.data.pcm16 as Int16Array;
            const base64 = this.toBase64Optimized(pcm16);

            this.ws.send(
              JSON.stringify({
                type: "input_audio_buffer.append",
                audio: base64,
              }),
            );
          }
        };

        this.sourceNode.connect(this.workletNode);
        // AudioWorklet doesn't need to connect to destination for capture-only
      } else {
        // Fallback to legacy ScriptProcessorNode
        // Use smaller buffer (2048) for lower latency since we optimized base64
        this.legacyProcessor = ctx.createScriptProcessor(2048, 1, 1);

        this.legacyProcessor.onaudioprocess = (event) => {
          if (
            !this.isRecording ||
            !this.ws ||
            this.ws.readyState !== WebSocket.OPEN
          )
            return;

          const input = event.inputBuffer.getChannelData(0);
          const pcm16 = this.float32ToPCM16(input);
          const base64 = this.toBase64Optimized(pcm16);

          this.ws.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64,
            }),
          );
        };

        this.sourceNode.connect(this.legacyProcessor);
        this.legacyProcessor.connect(ctx.destination);
      }

      this.isRecording = true;
    } catch (error: unknown) {
      console.error("Failed to start recording:", error);
      const err = error as { name?: string; message?: string } | null;

      if (
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError"
      ) {
        this.emit({
          type: "error",
          message: "Microphone permission denied. Please allow access.",
        });
      } else if (
        err?.name === "NotFoundError" ||
        err?.name === "DevicesNotFoundError"
      ) {
        this.emit({
          type: "error",
          message: "No microphone found.",
        });
      } else if (
        err?.name === "NotReadableError" ||
        err?.name === "TrackStartError"
      ) {
        this.emit({
          type: "error",
          message: "Microphone is busy or inaccessible.",
        });
      } else {
        this.emit({
          type: "error",
          message: `Microphone error: ${err?.message || "Unknown error"}`,
        });
      }

      // Ensure cleanup if start failed
      this.cleanupAudio();
      this.isRecording = false;
    }
  }

  stopRecording(requestResponse = true) {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Commit the current buffer
      this.ws.send(
        JSON.stringify({
          type: "input_audio_buffer.commit",
        }),
      );

      // Only request a response if explicitly asked (e.g. manual stop, not disconnect)
      if (requestResponse) {
        this.ws.send(
          JSON.stringify({
            type: "response.create",
          }),
        );
      }
    }

    this.cleanupAudio();
  }

  disconnect() {
    try {
      // Don't request a response when disconnecting
      this.stopRecording(false);
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    } catch (e) {
      console.warn("Error during disconnect:", e);
    } finally {
      this.assistantTranscript = "";
      this.clearAudioQueue();
      this.cleanupAudio();
    }
  }

  /**
   * Gracefully fade out and clear audio instead of abrupt stop.
   * This prevents the "cut off" sound when interrupting.
   */
  private clearAudioQueue(immediate = false) {
    if (immediate) {
      // Immediate stop (for disconnect)
      this.activeSources.forEach((source) => {
        try {
          source.stop();
        } catch (e) {
          // Ignore errors if source already stopped
        }
      });
    } else if (this.gainNode && this.audioContext) {
      // Graceful fade out over 100ms
      const now = this.audioContext.currentTime;
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

      // Stop sources after fade
      setTimeout(() => {
        this.activeSources.forEach((source) => {
          try {
            source.stop();
          } catch (e) {
            // Ignore
          }
        });
        this.activeSources = [];
        // Reset gain for next playback
        if (this.gainNode) {
          this.gainNode.gain.setValueAtTime(1, this.audioContext!.currentTime);
        }
      }, 120);
    }

    this.audioQueue = [];
    this.isPlaying = false;
    this.activeSources = [];
    this.nextStartTime = 0;
  }

  private cleanupAudio() {
    // Cleanup AudioWorklet
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode.port.onmessage = null;
      this.workletNode = null;
    }

    // Cleanup legacy ScriptProcessorNode
    if (this.legacyProcessor) {
      this.legacyProcessor.disconnect();
      this.legacyProcessor.onaudioprocess =
        null as unknown as ScriptProcessorNode["onaudioprocess"];
      this.legacyProcessor = null;
    }

    // Cleanup source node
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Cleanup gain node
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    // Stop all media tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    // Keep audioContext alive for playback; it will be disposed on disconnect
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext && this.audioContext.state === "closed") {
      this.audioContext = null;
      this.gainNode = null;
    }

    if (!this.audioContext) {
      const W = window as Window &
        typeof globalThis & {
          webkitAudioContext?: typeof AudioContext;
        };
      const AudioContextCtor = W.AudioContext || W.webkitAudioContext;
      if (!AudioContextCtor) {
        this.emit({
          type: "error",
          message: "AudioContext is not supported in this browser",
        });
        return null;
      }
      this.audioContext = new AudioContextCtor({
        sampleRate: 24000,
      });
    }

    // Create gain node for volume control and smooth transitions
    if (!this.gainNode && this.audioContext) {
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }

    return this.audioContext;
  }

  private handleServerMessage(raw: unknown) {
    try {
      const message = JSON.parse(String(raw));
      switch (message.type) {
        case "session.created":
          this.emit({ type: "session.created" });
          break;
        case "input_audio_buffer.speech_started":
          this.emit({ type: "user.speech_started" });
          // DON'T aggressively cancel audio - let it fade out naturally
          // Only fade out if there's significant audio playing
          if (this.activeSources.length > 2) {
            this.clearAudioQueue(false); // Graceful fade
          }
          // DON'T send response.cancel - let the server handle VAD naturally
          break;
        case "input_audio_buffer.speech_stopped":
          this.emit({ type: "user.speech_stopped" });
          break;
        case "response.audio.delta": {
          const base64Audio: string | undefined = message.delta;
          if (!base64Audio) break;
          const pcm16 = this.base64ToPCM16Optimized(base64Audio);
          this.queueAudio(pcm16);
          break;
        }
        case "response.audio_transcript.delta": {
          const delta: string = message.delta || "";
          if (!delta) return;
          this.assistantTranscript += delta;
          this.emit({ type: "assistant.transcript_delta", delta });
          break;
        }
        case "response.done": {
          if (this.assistantTranscript) {
            this.emit({
              type: "assistant.transcript_complete",
              transcript: this.assistantTranscript,
            });
            this.assistantTranscript = "";
          }
          // Flush any remaining audio in the buffer
          this.flushAudioBuffer();
          break;
        }
        case "error":
          this.emit({
            type: "error",
            message: message.error?.message || "Voice chat error",
          });
          break;
        default:
          break;
      }
    } catch (error) {
      console.warn("Failed to parse voice message", raw, error);
    }
  }

  private emit(event: VoiceChatEvent) {
    this.options.onEvent?.(event);
  }

  /**
   * Queue audio chunk and start playback when buffer is sufficient.
   * This prevents choppy audio from playing tiny chunks immediately.
   */
  private queueAudio(pcm16: Int16Array) {
    this.audioQueue.push(pcm16);

    // Start playing if we have enough buffered or if playback already started
    if (!this.isPlaying && this.audioQueue.length >= this.BUFFER_THRESHOLD) {
      this.isPlaying = true;
      this.processAudioQueue();
    } else if (this.isPlaying) {
      // Continue processing if already playing
      this.processAudioQueue();
    }
  }

  /**
   * Flush remaining audio buffer (called when response is complete).
   */
  private flushAudioBuffer() {
    if (this.audioQueue.length > 0 && !this.isPlaying) {
      this.isPlaying = true;
    }
    this.processAudioQueue();
  }

  /**
   * Process queued audio chunks with smooth transitions.
   */
  private processAudioQueue() {
    if (this.audioQueue.length === 0) {
      return;
    }

    // Merge multiple small chunks into larger ones for smoother playback
    const chunksToMerge = Math.min(this.audioQueue.length, 4);
    const chunks = this.audioQueue.splice(0, chunksToMerge);

    // Calculate total length
    let totalLength = 0;
    for (const chunk of chunks) {
      totalLength += chunk.length;
    }

    // Merge chunks with crossfade
    const merged = new Int16Array(totalLength);
    let offset = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      if (i > 0 && offset > 0) {
        // Apply crossfade at chunk boundary
        const fadeLength = Math.min(this.OVERLAP_SAMPLES, chunk.length, offset);
        for (let j = 0; j < fadeLength; j++) {
          const fadeIn = j / fadeLength;
          const fadeOut = 1 - fadeIn;
          const prevIdx = offset - fadeLength + j;
          if (prevIdx >= 0) {
            merged[prevIdx] = Math.round(
              merged[prevIdx] * fadeOut + chunk[j] * fadeIn,
            );
          }
        }
        // Copy rest of chunk (after fade region)
        merged.set(chunk.subarray(fadeLength), offset);
        offset += chunk.length - fadeLength;
      } else {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
    }

    // Play the merged audio
    this.playPCM16Buffered(merged.subarray(0, offset));

    // Schedule next batch if there's more
    if (this.audioQueue.length > 0) {
      // Use requestAnimationFrame for smoother scheduling
      requestAnimationFrame(() => this.processAudioQueue());
    }
  }

  /**
   * Play PCM16 audio with proper scheduling for gapless playback.
   */
  private playPCM16Buffered(pcm16: Int16Array) {
    const ctx = this.ensureAudioContext();
    if (!ctx || !this.gainNode) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }

    // Convert PCM16 to Float32
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    // Create audio buffer
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    // Create source
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);

    // Schedule for gapless playback
    const now = ctx.currentTime;
    // Add small padding (5ms) to prevent underrun gaps
    const padding = 0.005;
    const startTime = Math.max(now + padding, this.nextStartTime);

    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;

    // Track source for cleanup
    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx > -1) {
        this.activeSources.splice(idx, 1);
      }
      // Mark as not playing when all sources complete
      if (this.activeSources.length === 0 && this.audioQueue.length === 0) {
        this.isPlaying = false;
      }
    };
    this.activeSources.push(source);
  }

  private float32ToPCM16(float32Array: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  /**
   * Optimized base64 encoding using chunked String.fromCharCode.apply.
   * This avoids the slow string concatenation in a loop.
   */
  private toBase64Optimized(int16Array: Int16Array): string {
    const bytes = new Uint8Array(int16Array.buffer);
    const chunkSize = 0x8000; // 32KB chunks to avoid call stack limits
    const chunks: string[] = [];

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      chunks.push(
        String.fromCharCode.apply(null, chunk as unknown as number[]),
      );
    }

    return btoa(chunks.join(""));
  }

  /**
   * Optimized base64 decoding using chunked processing.
   */
  private base64ToPCM16Optimized(base64: string): Int16Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);

    // Process in chunks for better performance
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
      const end = Math.min(i + chunkSize, len);
      for (let j = i; j < end; j++) {
        bytes[j] = binary.charCodeAt(j);
      }
    }

    return new Int16Array(bytes.buffer);
  }
}
