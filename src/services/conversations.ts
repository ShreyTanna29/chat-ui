import { apiFetch } from "./api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  _count?: {
    messages: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Get all conversations for the current user
export async function getConversations(
  page: number = 1,
  limit: number = 20
): Promise<{
  success: boolean;
  conversations?: Conversation[];
  pagination?: PaginationInfo;
  message?: string;
}> {
  const response = await apiFetch<{
    conversations: Conversation[];
    pagination: PaginationInfo;
  }>(`/api/chat/conversations?page=${page}&limit=${limit}`);

  if (response.success && response.data) {
    return {
      success: true,
      conversations: response.data.conversations,
      pagination: response.data.pagination,
    };
  }

  return { success: false, message: response.message };
}

// Get a specific conversation with all messages
export async function getConversation(id: string): Promise<{
  success: boolean;
  conversation?: Conversation;
  message?: string;
}> {
  const response = await apiFetch<Conversation>(
    `/api/chat/conversations/${id}`
  );

  if (response.success && response.data) {
    return { success: true, conversation: response.data };
  }

  return { success: false, message: response.message };
}

// Create a new conversation
export async function createConversation(title?: string): Promise<{
  success: boolean;
  conversation?: Conversation;
  message?: string;
}> {
  const response = await apiFetch<Conversation>("/api/chat/conversations", {
    method: "POST",
    body: JSON.stringify({ title: title || "New Chat" }),
  });

  if (response.success && response.data) {
    return { success: true, conversation: response.data };
  }

  return { success: false, message: response.message };
}

// Update a conversation (e.g., rename title)
export async function updateConversation(
  id: string,
  updates: { title?: string }
): Promise<{
  success: boolean;
  conversation?: Conversation;
  message?: string;
}> {
  const response = await apiFetch<Conversation>(
    `/api/chat/conversations/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(updates),
    }
  );

  if (response.success && response.data) {
    return { success: true, conversation: response.data };
  }

  return { success: false, message: response.message };
}

// Delete a specific conversation
export async function deleteConversation(id: string): Promise<{
  success: boolean;
  message?: string;
}> {
  const response = await apiFetch(`/api/chat/conversations/${id}`, {
    method: "DELETE",
  });

  return { success: response.success, message: response.message };
}

// Delete all conversations
export async function deleteAllConversations(): Promise<{
  success: boolean;
  message?: string;
}> {
  const response = await apiFetch("/api/chat/conversations", {
    method: "DELETE",
  });

  return { success: response.success, message: response.message };
}

// Search conversations
export async function searchConversations(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  success: boolean;
  conversations?: Conversation[];
  message?: string;
}> {
  const response = await apiFetch<Conversation[]>(
    `/api/chat/conversations/search?q=${encodeURIComponent(
      query
    )}&page=${page}&limit=${limit}`
  );

  if (response.success && response.data) {
    return { success: true, conversations: response.data };
  }

  return { success: false, message: response.message };
}
