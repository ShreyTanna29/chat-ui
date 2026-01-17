import { apiFetch } from "./api";
import type { Conversation, PaginationInfo } from "./conversations";

export interface Space {
  id: string;
  userId: string;
  name: string;
  defaultPrompt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    conversations: number;
  };
}

export interface SpacesListResponse {
  spaces: Space[];
  pagination: PaginationInfo;
}

// Get all spaces for the current user
export async function getSpaces(
  page: number = 1,
  limit: number = 20
): Promise<{
  success: boolean;
  spaces?: Space[];
  pagination?: PaginationInfo;
  message?: string;
}> {
  const response = await apiFetch<SpacesListResponse>(
    `/api/chat/spaces?page=${page}&limit=${limit}`
  );

  if (response.success && response.data) {
    return {
      success: true,
      spaces: response.data.spaces,
      pagination: response.data.pagination,
    };
  }

  return { success: false, message: response.message };
}

// Create a new space
export async function createSpace(input: {
  name: string;
  defaultPrompt?: string | null;
}): Promise<{
  success: boolean;
  space?: Space;
  message?: string;
}> {
  const response = await apiFetch<Space>("/api/chat/spaces", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (response.success && response.data) {
    return { success: true, space: response.data };
  }

  return { success: false, message: response.message };
}

// Get a single space
export async function getSpace(id: string): Promise<{
  success: boolean;
  space?: Space;
  message?: string;
}> {
  const response = await apiFetch<Space>(`/api/chat/spaces/${id}`);

  if (response.success && response.data) {
    return { success: true, space: response.data };
  }

  return { success: false, message: response.message };
}

// Update space (name and/or defaultPrompt)
export async function updateSpace(
  id: string,
  updates: { name?: string; defaultPrompt?: string | null }
): Promise<{
  success: boolean;
  space?: Space;
  message?: string;
}> {
  const response = await apiFetch<Space>(`/api/chat/spaces/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });

  if (response.success && response.data) {
    return { success: true, space: response.data };
  }

  return { success: false, message: response.message };
}

// Delete a space
export async function deleteSpace(id: string): Promise<{
  success: boolean;
  message?: string;
}> {
  const response = await apiFetch(`/api/chat/spaces/${id}`, {
    method: "DELETE",
  });

  return { success: response.success, message: response.message };
}

// List conversations in a specific space
export async function getSpaceConversations(
  spaceId: string,
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
  }>(`/api/chat/spaces/${spaceId}/conversations?page=${page}&limit=${limit}`);

  if (response.success && response.data) {
    return {
      success: true,
      conversations: response.data.conversations,
      pagination: response.data.pagination,
    };
  }

  return { success: false, message: response.message };
}
