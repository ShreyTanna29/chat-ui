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
 * Lightweight client for the /api/chat/voice-realtime WebSocket endpoint.
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
  private processor: ScriptProcessorNode | null = null;
  private isRecording = false;
  private options: VoiceChatOptions;
  private assistantTranscript = "";
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

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

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      const source = ctx.createMediaStreamSource(this.mediaStream);
      // Increase buffer size to 4096 to reduce WebSocket message frequency and overhead
      this.processor = ctx.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (
          !this.isRecording ||
          !this.ws ||
          this.ws.readyState !== WebSocket.OPEN
        )
          return;

        const input = event.inputBuffer.getChannelData(0);
        const pcm16 = this.float32ToPCM16(input);
        const base64 = this.toBase64(pcm16);

        this.ws.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: base64,
          }),
        );
      };

      source.connect(this.processor);
      this.processor.connect(ctx.destination);

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

  private clearAudioQueue() {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if source already stopped
      }
    });
    this.activeSources = [];
    this.nextStartTime = 0;
  }

  private cleanupAudio() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess =
        null as unknown as ScriptProcessorNode["onaudioprocess"];
      this.processor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    // Keep audioContext alive for playback; it will be disposed on disconnect
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.audioContext && this.audioContext.state === "closed") {
      this.audioContext = null;
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
          // Clear any pending audio playback when user starts speaking to avoid overlap
          this.clearAudioQueue();

          // Optionally cancel the current response on the server if supported
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "response.cancel" }));
          }
          break;
        case "input_audio_buffer.speech_stopped":
          this.emit({ type: "user.speech_stopped" });
          break;
        case "response.audio.delta": {
          const base64Audio: string | undefined = message.delta;
          if (!base64Audio) break;
          const pcm16 = this.base64ToPCM16(base64Audio);
          this.playPCM16(pcm16);
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

  private playPCM16(pcm16: Int16Array) {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }

    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      const s = pcm16[i] / 0x8000;
      float32[i] = Math.max(-1, Math.min(1, s));
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    // Schedule audio to play seamlessly
    // If nextStartTime is in the past (underrun), start immediately
    // Otherwise, schedule for the end of the previous chunk
    const startTime = Math.max(ctx.currentTime, this.nextStartTime);
    source.start(startTime);

    // Update next start time
    this.nextStartTime = startTime + buffer.duration;

    // Track active source
    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
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

  private toBase64(int16Array: Int16Array): string {
    let binary = "";
    const bytes = new Uint8Array(int16Array.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToPCM16(base64: string): Int16Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }
}
