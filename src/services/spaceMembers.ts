import { apiFetch } from "./api";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface SpaceMember {
  id: string;
  spaceId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  addedAt: string;
  addedBy?: string;
  user?: User;
  name?: string;
  email?: string;
  avatar?: string | null;
}

export interface SpaceMembersResponse {
  owner: SpaceMember;
  members: SpaceMember[];
}

// Search for users by email or name
export async function searchUsers(
  query: string,
  limit: number = 10,
): Promise<{
  success: boolean;
  users?: User[];
  message?: string;
}> {
  if (query.trim().length < 2) {
    return {
      success: false,
      message: "Search query must be at least 2 characters",
    };
  }

  const response = await apiFetch<User[]>(
    `/api/auth/users/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );

  if (response.success && response.data) {
    return { success: true, users: response.data };
  }

  return { success: false, message: response.message };
}

// Add a member to a space
export async function addSpaceMember(
  spaceId: string,
  userId: string,
  role: "member" | "admin" = "member",
): Promise<{
  success: boolean;
  member?: SpaceMember;
  message?: string;
}> {
  const response = await apiFetch<SpaceMember>(
    `/api/chat/spaces/${spaceId}/members`,
    {
      method: "POST",
      body: JSON.stringify({ userId, role }),
    },
  );

  if (response.success && response.data) {
    return { success: true, member: response.data };
  }

  return { success: false, message: response.message };
}

// Get all members of a space
export async function getSpaceMembers(spaceId: string): Promise<{
  success: boolean;
  data?: SpaceMembersResponse;
  message?: string;
}> {
  const response = await apiFetch<SpaceMembersResponse>(
    `/api/chat/spaces/${spaceId}/members`,
  );

  if (response.success && response.data) {
    return { success: true, data: response.data };
  }

  return { success: false, message: response.message };
}

// Remove a member from a space
export async function removeSpaceMember(
  spaceId: string,
  userId: string,
): Promise<{
  success: boolean;
  message?: string;
}> {
  const response = await apiFetch(
    `/api/chat/spaces/${spaceId}/members/${userId}`,
    {
      method: "DELETE",
    },
  );

  return { success: response.success, message: response.message };
}

// Update a member's role
export async function updateMemberRole(
  spaceId: string,
  userId: string,
  role: "member" | "admin",
): Promise<{
  success: boolean;
  member?: SpaceMember;
  message?: string;
}> {
  const response = await apiFetch<SpaceMember>(
    `/api/chat/spaces/${spaceId}/members/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
  );

  if (response.success && response.data) {
    return { success: true, member: response.data };
  }

  return { success: false, message: response.message };
}
