// API Configuration
export const API_BASE_URL = "https://eruditeaic.com";

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

// Token refresh state management
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Attempt to refresh the access token
async function attemptTokenRefresh(): Promise<boolean> {
  // If already refreshing, wait for the existing refresh to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.data?.accessToken) {
        localStorage.setItem("accessToken", data.data.accessToken);
        return true;
      }

      // Refresh failed, clear tokens
      clearTokens();
      return false;
    } catch (error) {
      console.error("Token refresh error:", error);
      clearTokens();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Generic fetch wrapper with auth headers and automatic token refresh
export async function apiFetch<T = unknown>(
  endpoint: string,
  options?: RequestInit,
  _isRetry = false,
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

    // Handle 401 Unauthorized - attempt token refresh and retry
    if (
      response.status === 401 &&
      !_isRetry &&
      endpoint !== "/api/auth/refresh"
    ) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        // Retry the original request with new token
        return apiFetch<T>(endpoint, options, true);
      }
      // Refresh failed, return the original error
      return {
        success: false,
        message: data.message || "Session expired. Please log in again.",
        errors: data.errors,
      };
    }

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

// Raw fetch for streaming (SSE) endpoints with automatic token refresh
export async function apiRawFetch(
  endpoint: string,
  options?: RequestInit,
  _isRetry = false,
): Promise<Response> {
  const token = getAccessToken();

  // Don't set Content-Type for FormData - browser will set it with correct boundary
  const isFormData = options?.body instanceof FormData;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  // Handle 401 Unauthorized - attempt token refresh and retry
  if (response.status === 401 && !_isRetry) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry the original request with new token
      return apiRawFetch(endpoint, options, true);
    }
  }

  return response;
}

// FormData fetch for file uploads (multipart/form-data) with automatic token refresh
export async function apiFormDataFetch(
  endpoint: string,
  formData: FormData,
  options?: Omit<RequestInit, "body">,
  _isRetry = false,
): Promise<Response> {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      // Don't set Content-Type - browser sets it with boundary for FormData
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
    ...options,
  });

  // Handle 401 Unauthorized - attempt token refresh and retry
  if (response.status === 401 && !_isRetry) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry the original request with new token
      return apiFormDataFetch(endpoint, formData, options, true);
    }
  }

  return response;
}
