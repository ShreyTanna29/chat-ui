import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  User,
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
  getProfile,
  googleLogin as apiGoogleLogin,
  getGoogleOAuthUrl,
  getAppleOAuthUrl,
} from "@/services/auth";
import { getAccessToken, clearTokens, setTokens } from "@/services/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  oauthError: string | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  signup: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loginWithGoogle: () => void;
  loginWithApple: () => void;
  handleOAuthCallback: () => Promise<boolean>;
  clearOAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Handle OAuth callback - parse tokens from URL
  const handleOAuthCallback = useCallback(async (): Promise<boolean> => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    const search = window.location.search;

    // Check if this is a Google callback
    if (path === "/auth/google/callback") {
      setIsLoading(true);
      try {
        // Google returns tokens in the hash fragment
        const params = new URLSearchParams(hash.substring(1));
        const idToken = params.get("id_token");
        const error = params.get("error");

        if (error) {
          setOauthError(`Google login failed: ${error}`);
          window.history.replaceState({}, "", "/");
          return false;
        }

        if (idToken) {
          const result = await apiGoogleLogin(idToken);
          if (result.success && result.user) {
            setUser(result.user);
            window.history.replaceState({}, "", "/");
            return true;
          } else {
            setOauthError(result.message || "Google login failed");
          }
        }
        window.history.replaceState({}, "", "/");
        return false;
      } catch (err) {
        setOauthError("Google login failed. Please try again.");
        window.history.replaceState({}, "", "/");
        return false;
      } finally {
        setIsLoading(false);
      }
    }

    // Check if this is an Apple/OAuth callback from backend
    // Backend redirects here with tokens after processing Apple's form_post
    if (path === "/auth/apple/callback" || path === "/auth/callback") {
      setIsLoading(true);
      try {
        const searchParams = new URLSearchParams(search.substring(1));

        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");
        const error = searchParams.get("error");
        const errorMessage = searchParams.get("message");

        if (error || errorMessage) {
          setOauthError(`Apple login failed: ${errorMessage || error}`);
          window.history.replaceState({}, "", "/");
          return false;
        }

        // Backend redirects with tokens directly
        if (accessToken && refreshToken) {
          setTokens(accessToken, refreshToken);
          // Fetch user profile with the new tokens
          const result = await getProfile();
          if (result.success && result.user) {
            setUser(result.user);
            window.history.replaceState({}, "", "/");
            return true;
          } else {
            setOauthError("Failed to get user profile");
          }
        } else {
          setOauthError("Apple login failed: No tokens received");
        }
        window.history.replaceState({}, "", "/");
        return false;
      } catch (err) {
        setOauthError("Apple login failed. Please try again.");
        window.history.replaceState({}, "", "/");
        return false;
      } finally {
        setIsLoading(false);
      }
    }

    return false;
  }, []);

  // Check for existing session on mount and handle OAuth callbacks
  useEffect(() => {
    const checkAuth = async () => {
      // First check if this is an OAuth callback
      const path = window.location.pathname;
      if (
        path === "/auth/google/callback" ||
        path === "/auth/apple/callback" ||
        path === "/auth/callback"
      ) {
        await handleOAuthCallback();
        return;
      }

      // Otherwise check for existing session
      const token = getAccessToken();
      if (token) {
        const result = await getProfile();
        if (result.success && result.user) {
          setUser(result.user);
        } else {
          // Token is invalid, clear it
          clearTokens();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [handleOAuthCallback]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await apiLogin({ email, password });
      if (result.success && result.user) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, message: result.message || "Login failed" };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const result = await apiSignup({ name, email, password });
        if (result.success && result.user) {
          setUser(result.user);
          return { success: true };
        }
        return { success: false, message: result.message || "Signup failed" };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiLogout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const result = await getProfile();
    if (result.success && result.user) {
      setUser(result.user);
    }
  }, []);

  // Initiate Google OAuth flow
  const loginWithGoogle = useCallback(() => {
    setOauthError(null);
    window.location.href = getGoogleOAuthUrl();
  }, []);

  // Initiate Apple OAuth flow
  const loginWithApple = useCallback(() => {
    setOauthError(null);
    window.location.href = getAppleOAuthUrl();
  }, []);

  // Clear OAuth error
  const clearOAuthError = useCallback(() => {
    setOauthError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        oauthError,
        login,
        signup,
        logout,
        refreshUser,
        loginWithGoogle,
        loginWithApple,
        handleOAuthCallback,
        clearOAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
