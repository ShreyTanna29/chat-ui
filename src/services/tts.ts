import { API_BASE_URL, getAccessToken } from "./api";

export interface TTSOptions {
  voice?: string;
  speed?: number;
  instructions?: string;
  responseFormat?: "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";
}

interface TTSResponse {
  success: boolean;
  message: string;
  data?: {
    audio: string; // base64 encoded audio
    format: string;
    contentType: string;
    voice: string;
    textLength: number;
    audioSize: number;
    timestamp: string;
  };
}

// Maximum characters per TTS request (API limit is 4096, but user specified 2000 tokens)
const MAX_CHARS_PER_REQUEST = 2000;

/**
 * Split text into chunks for TTS processing
 * Tries to split at sentence boundaries for natural speech
 */
export function splitTextForTTS(
  text: string,
  maxChars: number = MAX_CHARS_PER_REQUEST,
): string[] {
  // Strip markdown formatting for cleaner speech
  const cleanText = stripMarkdown(text);

  if (cleanText.length <= maxChars) {
    return [cleanText];
  }

  const chunks: string[] = [];
  let remainingText = cleanText;

  while (remainingText.length > 0) {
    if (remainingText.length <= maxChars) {
      chunks.push(remainingText.trim());
      break;
    }

    // Find the best split point within the limit
    let splitIndex = maxChars;

    // Try to find sentence boundary (. ! ?)
    const sentenceEnd = remainingText.slice(0, maxChars).lastIndexOf(". ");
    const exclamationEnd = remainingText.slice(0, maxChars).lastIndexOf("! ");
    const questionEnd = remainingText.slice(0, maxChars).lastIndexOf("? ");

    const bestSentenceEnd = Math.max(sentenceEnd, exclamationEnd, questionEnd);

    if (bestSentenceEnd > maxChars * 0.5) {
      // Found a good sentence boundary in the latter half
      splitIndex = bestSentenceEnd + 2; // Include the punctuation and space
    } else {
      // Try to find paragraph boundary
      const paragraphEnd = remainingText.slice(0, maxChars).lastIndexOf("\n\n");
      if (paragraphEnd > maxChars * 0.3) {
        splitIndex = paragraphEnd + 2;
      } else {
        // Try to find line break
        const lineBreak = remainingText.slice(0, maxChars).lastIndexOf("\n");
        if (lineBreak > maxChars * 0.3) {
          splitIndex = lineBreak + 1;
        } else {
          // Fall back to word boundary
          const lastSpace = remainingText.slice(0, maxChars).lastIndexOf(" ");
          if (lastSpace > maxChars * 0.5) {
            splitIndex = lastSpace + 1;
          }
        }
      }
    }

    chunks.push(remainingText.slice(0, splitIndex).trim());
    remainingText = remainingText.slice(splitIndex).trim();
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Strip markdown formatting from text for cleaner TTS
 */
function stripMarkdown(text: string): string {
  return (
    text
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`]+`/g, "")
      // Remove headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}$/gm, "")
      // Remove blockquotes
      .replace(/^>\s+/gm, "")
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Clean up extra whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * Call the TTS API endpoint
 */
async function callTTSAPI(
  text: string,
  options: TTSOptions = {},
): Promise<TTSResponse> {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}/api/chat/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({
      text,
      voice: options.voice || "nova",
      speed: options.speed || 1.0,
      instructions: options.instructions,
      response_format: options.responseFormat || "mp3",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `TTS request failed with status ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Convert base64 audio to a playable audio element
 */
function createAudioFromBase64(
  base64: string,
  contentType: string,
): HTMLAudioElement {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: contentType });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  // Clean up the URL when audio is done
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), {
    once: true,
  });

  return audio;
}

export interface TTSController {
  stop: () => void;
  isPlaying: () => boolean;
}

/**
 * Speak the given text using TTS
 * Handles splitting long text and playing chunks sequentially
 */
export function speakText(
  text: string,
  options: TTSOptions = {},
  callbacks?: {
    onStart?: () => void;
    onChunkStart?: (chunkIndex: number, totalChunks: number) => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  },
): TTSController {
  let stopped = false;
  let currentAudio: HTMLAudioElement | null = null;
  let isCurrentlyPlaying = false;
  let resolveCurrentPlayback: (() => void) | null = null;

  const controller: TTSController = {
    stop: () => {
      stopped = true;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        // Revoke the URL to free memory
        const src = currentAudio.src;
        currentAudio.src = "";
        if (src.startsWith("blob:")) {
          URL.revokeObjectURL(src);
        }
        currentAudio = null;
      }
      // Resolve any pending playback promise
      if (resolveCurrentPlayback) {
        resolveCurrentPlayback();
        resolveCurrentPlayback = null;
      }
      isCurrentlyPlaying = false;
      callbacks?.onEnd?.();
    },
    isPlaying: () => isCurrentlyPlaying,
  };

  // Start playback asynchronously
  (async () => {
    // Split text into chunks
    const chunks = splitTextForTTS(text);

    if (chunks.length === 0) {
      callbacks?.onError?.(new Error("No text to speak"));
      return;
    }

    isCurrentlyPlaying = true;
    let hasStartedPlaying = false;

    // Process each chunk sequentially
    for (let i = 0; i < chunks.length; i++) {
      if (stopped) break;

      callbacks?.onChunkStart?.(i, chunks.length);

      try {
        const response = await callTTSAPI(chunks[i], options);

        if (stopped) break;

        if (!response.success || !response.data?.audio) {
          throw new Error(response.message || "Failed to generate speech");
        }

        if (stopped) break;

        // Create and play audio
        const audio = createAudioFromBase64(
          response.data.audio,
          response.data.contentType || "audio/mpeg",
        );
        currentAudio = audio;

        // Wait for audio to finish playing
        await new Promise<void>((resolve, reject) => {
          resolveCurrentPlayback = resolve;

          audio.addEventListener(
            "ended",
            () => {
              resolveCurrentPlayback = null;
              resolve();
            },
            { once: true },
          );

          audio.addEventListener(
            "error",
            (e) => {
              resolveCurrentPlayback = null;
              reject(new Error(`Audio playback error: ${e}`));
            },
            { once: true },
          );

          audio
            .play()
            .then(() => {
              // Call onStart only when audio actually begins playing
              if (!hasStartedPlaying) {
                hasStartedPlaying = true;
                callbacks?.onStart?.();
              }
            })
            .catch((err) => {
              resolveCurrentPlayback = null;
              reject(err);
            });
        });

        currentAudio = null;
      } catch (error) {
        if (!stopped) {
          callbacks?.onError?.(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
        break;
      }
    }

    isCurrentlyPlaying = false;
    if (!stopped) {
      callbacks?.onEnd?.();
    }
  })();

  // Return controller immediately so stop() can be called
  return controller;
}
