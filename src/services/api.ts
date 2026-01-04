// API Configuration
export const API_BASE_URL = "http://3.138.200.50:3000";

// Token management utilities
export function getAccessToken(): string | null {
  return localStorage.getItem("accessToken");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

// Generic fetch wrapper with auth headers
export async function apiFetch<T = unknown>(
  endpoint: string,
  options?: RequestInit
): Promise<{
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}> {
  const token = getAccessToken();

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "An error occurred",
        errors: data.errors,
      };
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

// Raw fetch for streaming (SSE) endpoints
export async function apiRawFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const token = getAccessToken();

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
}
