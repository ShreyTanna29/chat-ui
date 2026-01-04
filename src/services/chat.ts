import { apiRawFetch } from "./api";

export interface StreamChatOptions {
  prompt: string;
  conversationId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamCallbacks {
  onChunk: (content: string) => void;
  onDone: (fullResponse: string, conversationId?: string) => void;
  onError: (error: string) => void;
}

// Stream a chat response using Server-Sent Events
export async function streamChat(
  options: StreamChatOptions,
  callbacks: StreamCallbacks
): Promise<{ abort: () => void }> {
  const controller = new AbortController();

  try {
    const response = await apiRawFetch("/api/chat/stream", {
      method: "POST",
      body: JSON.stringify({
        prompt: options.prompt,
        conversationId: options.conversationId,
        model: options.model || "gpt-4.1-mini",
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
      }),
      signal: controller.signal,
    });

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
                    // Stream started - may include conversationId
                    console.log("[Chat] Stream connected:", data);
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
                    callbacks.onDone(
                      data.full_response || fullResponse,
                      conversationId
                    );
                    return;

                  case "error":
                    callbacks.onError(data.message || "Stream error");
                    return;

                  case "close":
                    callbacks.onDone(fullResponse, conversationId);
                    return;
                }
              } catch (parseError) {
                // Skip malformed JSON
                console.warn("Failed to parse SSE data:", dataStr);
              }
            }
          }
        }

        // Stream ended without explicit done message
        if (fullResponse) {
          callbacks.onDone(fullResponse, conversationId);
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
