import { apiFetch, setTokens, clearTokens, getRefreshToken } from "./api";

export interface User {
  _id: string;
  name: string;
  email: string;
  isVerified: boolean;
  preferences: {
    theme: string;
    language: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
}

// Login with email and password
export async function login(credentials: LoginCredentials): Promise<{
  success: boolean;
  user?: User;
  message?: string;
}> {
  const response = await apiFetch<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (response.success && response.data) {
    setTokens(response.data.accessToken, response.data.refreshToken);
    return { success: true, user: response.data.user };
  }

  return { success: false, message: response.message };
}

// Sign up with name, email, and password
export async function signup(credentials: SignupCredentials): Promise<{
  success: boolean;
  user?: User;
  message?: string;
}> {
  const response = await apiFetch<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (response.success && response.data) {
    setTokens(response.data.accessToken, response.data.refreshToken);
    return { success: true, user: response.data.user };
  }

  return { success: false, message: response.message };
}

// Logout
export async function logout(): Promise<{ success: boolean }> {
  const response = await apiFetch("/api/auth/logout", {
    method: "POST",
  });

  // Always clear tokens, even if API call fails
  clearTokens();

  return { success: response.success };
}

// Refresh access token
export async function refreshAccessToken(): Promise<{
  success: boolean;
  accessToken?: string;
}> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return { success: false };
  }

  const response = await apiFetch<{ accessToken: string }>(
    "/api/auth/refresh",
    {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }
  );

  if (response.success && response.data) {
    localStorage.setItem("accessToken", response.data.accessToken);
    return { success: true, accessToken: response.data.accessToken };
  }

  // If refresh fails, clear all tokens
  clearTokens();
  return { success: false };
}

// Get current user profile
export async function getProfile(): Promise<{
  success: boolean;
  user?: User;
  message?: string;
}> {
  const response = await apiFetch<{ user: User }>("/api/auth/profile");

  if (response.success && response.data) {
    return { success: true, user: response.data.user };
  }

  return { success: false, message: response.message };
}

// Update user profile
export async function updateProfile(updates: {
  name?: string;
  preferences?: { theme?: string; language?: string };
}): Promise<{
  success: boolean;
  user?: User;
  message?: string;
}> {
  const response = await apiFetch<{ user: User }>("/api/auth/profile", {
    method: "PUT",
    body: JSON.stringify(updates),
  });

  if (response.success && response.data) {
    return { success: true, user: response.data.user };
  }

  return { success: false, message: response.message };
}
