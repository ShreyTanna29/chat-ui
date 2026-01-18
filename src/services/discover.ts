// Discover API service
import { apiFetch } from "./api";

// Types based on API documentation
export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  imageUrl: string;
  category: string;
  publishedAt: string;
}

export interface DiscoverResponse {
  success: boolean;
  data: NewsArticle[];
  lastUpdated: string | null;
  count: number;
  isLoading?: boolean;
  isFallback?: boolean;
  message?: string;
}

export interface PreferencesResponse {
  success: boolean;
  message: string;
  preferences?: {
    countries: string[];
    categories: string[];
  };
  error?: string;
}

// Available categories for preferences
export const AVAILABLE_CATEGORIES = [
  "AI",
  "Software",
  "Hardware",
  "Startups",
  "Cybersecurity",
  "Cloud",
  "Mobile",
  "Gaming",
  "Science",
  "Business",
] as const;

// Common countries for preferences
export const AVAILABLE_COUNTRIES = [
  "USA",
  "India",
  "UK",
  "Canada",
  "Germany",
  "France",
  "Australia",
  "Japan",
  "China",
  "Singapore",
] as const;

/**
 * Get default/global tech news (no auth required)
 */
export async function getDefaultNews(): Promise<DiscoverResponse> {
  const result = await apiFetch<DiscoverResponse>("/api/discover");

  if (!result.success) {
    return {
      success: false,
      data: [],
      lastUpdated: null,
      count: 0,
      message: result.message || "Failed to fetch news",
    };
  }

  // apiFetch returns the API response directly when successful
  return result as unknown as DiscoverResponse;
}

/**
 * Get customized tech news based on user preferences (auth required)
 */
export async function getCustomNews(): Promise<DiscoverResponse> {
  const result = await apiFetch<DiscoverResponse>("/api/discover/custom");

  if (!result.success) {
    return {
      success: false,
      data: [],
      lastUpdated: null,
      count: 0,
      message: result.message || "Failed to fetch custom news",
    };
  }

  // apiFetch returns the API response directly when successful
  return result as unknown as DiscoverResponse;
}

/**
 * Update user news preferences
 */
export async function updatePreferences(
  countries: string[],
  categories: string[],
): Promise<PreferencesResponse> {
  const result = await apiFetch<PreferencesResponse>(
    "/api/discover/preferences",
    {
      method: "POST",
      body: JSON.stringify({ countries, categories }),
    },
  );

  if (!result.success) {
    return {
      success: false,
      message: result.message || "Failed to update preferences",
    };
  }

  // apiFetch returns the API response directly when successful
  return result as unknown as PreferencesResponse;
}
