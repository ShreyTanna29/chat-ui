import { apiFetch } from "./api";

export interface SharedConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SharedConversation {
  id: string;
  shareId: string;
  title: string;
  messages: SharedConversationMessage[];
  sharedBy?: string;
  sharedAt: string;
  createdAt: string;
}

export interface ShareResponse {
  shareId: string;
  shareUrl: string;
}

// Share a conversation (creates a public shareable link)
export async function shareConversation(conversationId: string): Promise<{
  success: boolean;
  data?: ShareResponse;
  message?: string;
}> {
  const response = await apiFetch<ShareResponse>("/api/chat/share", {
    method: "POST",
    body: JSON.stringify({ conversationId }),
  });

  if (response.success && response.data) {
    return { success: true, data: response.data };
  }

  return { success: false, message: response.message };
}

// Get a shared conversation (public endpoint, no auth required)
export async function getSharedConversation(shareId: string): Promise<{
  success: boolean;
  conversation?: SharedConversation;
  message?: string;
}> {
  // This endpoint should be public (no auth token needed)
  try {
    const API_BASE_URL = "https://eruditeaic.com";
    const response = await fetch(`${API_BASE_URL}/api/chat/shared/${shareId}`);
    const data = await response.json();

    if (response.ok && data.success) {
      return { success: true, conversation: data.data };
    }

    return {
      success: false,
      message: data.message || "Failed to load shared chat",
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
