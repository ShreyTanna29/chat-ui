/**
 * AudioWorklet Processor for real-time voice chat.
 * This runs in a separate thread from the main UI, providing
 * much better performance than ScriptProcessorNode.
 */
class VoiceChatProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048; // samples per chunk (smaller = lower latency)
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  /**
   * Process audio data in real-time.
   * Called by the audio context with 128 samples at a time.
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) {
      return true; // Keep processor alive
    }

    const channelData = input[0];

    // Accumulate samples into buffer
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];

      // When buffer is full, convert to PCM16 and send to main thread
      if (this.bufferIndex >= this.bufferSize) {
        const pcm16 = this.float32ToPCM16(this.buffer);
        this.port.postMessage({ type: "audio", pcm16 }, [pcm16.buffer]);

        // Reset buffer
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }
    }

    return true; // Keep processor alive
  }

  /**
   * Convert Float32 audio samples to PCM16 format.
   * PCM16 is the format expected by OpenAI's Realtime API.
   */
  float32ToPCM16(float32Array) {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }
}

registerProcessor("voice-chat-processor", VoiceChatProcessor);
