import { apiRawFetch, apiFormDataFetch } from "./api";

export interface StreamChatOptions {
  prompt: string;
  conversationId?: string;
  /** Optional space to associate this conversation with */
  spaceId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  image?: File; // Optional image file
  document?: File; // Optional document file (PDF, DOCX, TXT)
  thinkMode?: boolean; // Enable deep reasoning mode
  researchMode?: boolean; // Enable web research mode
}

export interface StreamCallbacks {
  onChunk: (content: string) => void;
  onDone: (
    fullResponse: string,
    conversationId?: string,
    generatedImages?: Array<{ url: string; revised_prompt?: string }>
  ) => void;
  onError: (error: string) => void;
  onStreamId?: (streamId: string) => void;
  onImage?: (image: string) => void;
  onProgress?: (message: string) => void;
}

// Stream a chat response using Server-Sent Events
export async function streamChat(
  options: StreamChatOptions,
  callbacks: StreamCallbacks
): Promise<{ abort: () => void }> {
  const controller = new AbortController();

  try {
    const hasFiles = options.image || options.document;
    let response: Response;

    if (hasFiles) {
      // Use FormData for file uploads
      const formData = new FormData();
      formData.append("prompt", options.prompt);
      if (options.conversationId) {
        formData.append("conversationId", options.conversationId);
      }
      if (options.spaceId) {
        formData.append("spaceId", options.spaceId);
      }
      formData.append("model", options.model || "gpt-4.1-mini");
      formData.append("temperature", String(options.temperature || 0.7));
      formData.append("maxTokens", String(options.maxTokens || 2000));

      if (options.image) {
        formData.append("image", options.image);
      }
      if (options.document) {
        formData.append("document", options.document);
      }
      // Add mode flags if specified
      if (options.thinkMode) {
        formData.append("thinkMode", "true");
      }
      if (options.researchMode) {
        formData.append("researchMode", "true");
      }

      response = await apiFormDataFetch("/api/chat/stream", formData, {
        signal: controller.signal,
      });
    } else {
      // Use JSON for text-only messages
      const bodyData: Record<string, unknown> = {
        prompt: options.prompt,
        conversationId: options.conversationId,
        spaceId: options.spaceId,
        model: options.model || "gpt-4.1-mini",
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
      };
      // Add mode flags if specified
      if (options.thinkMode) {
        bodyData.thinkMode = true;
      }
      if (options.researchMode) {
        bodyData.researchMode = true;
      }

      response = await apiRawFetch("/api/chat/stream", {
        method: "POST",
        body: JSON.stringify(bodyData),
        signal: controller.signal,
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      callbacks.onError(errorData.message || "Failed to start chat stream");
      return { abort: () => controller.abort() };
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError("Failed to get response reader");
      return { abort: () => controller.abort() };
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullResponse = "";
    let conversationId: string | undefined;

    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages (ending with double newline)
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6); // Remove 'data: ' prefix

              if (!dataStr.trim()) continue;

              try {
                const data = JSON.parse(dataStr);

                // Try to extract conversationId from any field - backends may use different names
                const possibleId =
                  data.conversationId ||
                  data.conversation_id ||
                  data.convId ||
                  data.id;
                if (possibleId && !conversationId) {
                  conversationId = possibleId;
                  console.log("[Chat] Got conversationId:", conversationId);
                }

                switch (data.type) {
                  case "connected":
                    // Stream started - may include conversationId and streamId
                    console.log("[Chat] Stream connected:", data);
                    if (data.streamId && callbacks.onStreamId) {
                      callbacks.onStreamId(data.streamId);
                    }
                    break;

                  case "chunk":
                    if (data.content) {
                      fullResponse += data.content;
                      callbacks.onChunk(data.content);
                    }
                    break;

                  case "done":
                    console.log("[Chat] Stream done:", data);
                    if (data.conversationId) {
                      conversationId = data.conversationId;
                    }
                    // Handle generated images in done response
                    if (data.generated_images && callbacks.onImage) {
                      for (const image of data.generated_images) {
                        if (image.url) {
                          callbacks.onImage(image.url);
                        }
                      }
                    }
                    callbacks.onDone(
                      data.full_response || fullResponse,
                      conversationId,
                      data.generated_images
                    );
                    return;

                  case "error":
                    callbacks.onError(data.message || "Stream error");
                    return;

                  case "image":
                    if (data.url && callbacks.onImage) {
                      callbacks.onImage(data.url);
                    }
                    break;

                  case "progress":
                    if (data.message && callbacks.onProgress) {
                      callbacks.onProgress(data.message);
                    }
                    break;

                  case "close":
                    callbacks.onDone(fullResponse, conversationId, undefined);
                    return;
                }
              } catch {
                // Skip malformed JSON
                console.warn("Failed to parse SSE data:", dataStr);
              }
            }
          }
        }

        // Stream ended without explicit done message
        if (fullResponse) {
          callbacks.onDone(fullResponse, conversationId, undefined);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // Stream was aborted - this is expected behavior
          return;
        }
        callbacks.onError(
          (error as Error).message || "Stream processing error"
        );
      }
    };

    processStream();

    return { abort: () => controller.abort() };
  } catch (error) {
    callbacks.onError(
      (error as Error).message || "Failed to connect to chat service"
    );
    return { abort: () => controller.abort() };
  }
}

// Simple (non-streaming) chat request
export async function simpleChat(options: StreamChatOptions): Promise<{
  success: boolean;
  response?: string;
  conversationId?: string;
  message?: string;
}> {
  try {
    const response = await apiRawFetch("/api/chat/simple", {
      method: "POST",
      body: JSON.stringify({
        prompt: options.prompt,
        conversationId: options.conversationId,
        model: options.model || "gpt-4.1-mini",
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
      }),
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        response: data.data.response,
        conversationId: data.data.conversationId,
      };
    }

    return { success: false, message: data.message };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// Stop an ongoing chat stream on the server
export async function stopStream(streamId: string): Promise<{
  success: boolean;
  data?: {
    streamId: string;
    conversationId: string;
    partialResponseLength: number;
    stoppedAt: string;
  };
  message?: string;
}> {
  try {
    const response = await apiRawFetch("/api/chat/stop", {
      method: "POST",
      body: JSON.stringify({ streamId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
