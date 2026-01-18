import { useState, FormEvent, useEffect } from "react";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { forgotPassword, resetPassword } from "@/services/auth";

interface AuthPageProps {
  onLogin: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message?: string }>;
  onSignup: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message?: string }>;
  onGoogleLogin?: () => void;
  onAppleLogin?: () => void;
  isLoading?: boolean;
  oauthError?: string | null;
  onClearOAuthError?: () => void;
}

type AuthMode = "login" | "signup" | "forgot" | "reset";

export function AuthPage({
  onLogin,
  onSignup,
  onGoogleLogin,
  onAppleLogin,
  isLoading = false,
  oauthError,
  onClearOAuthError,
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Show OAuth errors
  useEffect(() => {
    if (oauthError) {
      setError(oauthError);
      onClearOAuthError?.();
    }
  }, [oauthError, onClearOAuthError]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const result = await onLogin(email, password);
        if (!result.success) {
          setError(result.message || "Login failed");
        }
      } else if (mode === "signup") {
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setIsSubmitting(false);
          return;
        }
        const result = await onSignup(name, email, password);
        if (!result.success) {
          setError(result.message || "Signup failed");
        }
      } else if (mode === "forgot") {
        const result = await forgotPassword(email);
        if (result.success) {
          setSuccessMessage("OTP sent to your email");
          setMode("reset");
        } else {
          setError(result.message || "Failed to send OTP");
        }
      } else if (mode === "reset") {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setIsSubmitting(false);
          return;
        }
        const result = await resetPassword(email, otp, password);
        if (result.success) {
          setSuccessMessage("Password reset successfully. Please login.");
          setMode("login");
          setPassword("");
          setConfirmPassword("");
          setOtp("");
        } else {
          setError(result.message || "Failed to reset password");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError("");
    setSuccessMessage("");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
  };

  const loading = isLoading || isSubmitting;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="relative mx-auto w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-emerald-500 to-emerald-600 blur-2xl opacity-30 animate-glow-pulse" />
            <div className="relative w-16 h-16 rounded-[20px] bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-float overflow-hidden">
              <img
                src="/logo.jpg"
                alt="Erudite Logo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">
              {mode === "login"
                ? "Welcome back"
                : mode === "signup"
                  ? "Create account"
                  : mode === "forgot"
                    ? "Reset Password"
                    : "New Password"}
            </span>
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {mode === "login"
              ? "Sign in to continue your journey with Erudite"
              : mode === "signup"
                ? "Start your journey with Erudite AI assistant"
                : mode === "forgot"
                  ? "Enter your email to receive a reset code"
                  : "Enter the code sent to your email"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name field (signup only) */}
            {mode === "signup" && (
              <div className="space-y-2 animate-slide-up">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    size={20}
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className={cn(
                      "w-full pl-12 pr-4 py-3.5 rounded-xl",
                      "bg-[var(--color-surface-hover)] border border-[var(--color-border)]",
                      "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                      "focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10",
                      "transition-all duration-200",
                    )}
                  />
                </div>
              </div>
            )}

            {/* Email field (all modes except reset if we want to hide it, but keeping it is better) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                  size={20}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={mode === "reset"} // Lock email in reset mode
                  className={cn(
                    "w-full pl-12 pr-4 py-3.5 rounded-xl",
                    "bg-[var(--color-surface-hover)] border border-[var(--color-border)]",
                    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                    "focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10",
                    "transition-all duration-200",
                    mode === "reset" && "opacity-70 cursor-not-allowed",
                  )}
                />
              </div>
            </div>

            {/* OTP field (reset mode only) */}
            {mode === "reset" && (
              <div className="space-y-2 animate-slide-up">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Verification Code
                </label>
                <div className="relative">
                  <KeyRound
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    size={20}
                  />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    required
                    maxLength={6}
                    className={cn(
                      "w-full pl-12 pr-4 py-3.5 rounded-xl",
                      "bg-[var(--color-surface-hover)] border border-[var(--color-border)]",
                      "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                      "focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10",
                      "transition-all duration-200 tracking-widest",
                    )}
                  />
                </div>
              </div>
            )}

            {/* Password field (login, signup, reset) */}
            {mode !== "forgot" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                  {mode === "reset" ? "New Password" : "Password"}
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    size={20}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className={cn(
                      "w-full pl-12 pr-12 py-3.5 rounded-xl",
                      "bg-[var(--color-surface-hover)] border border-[var(--color-border)]",
                      "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                      "focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10",
                      "transition-all duration-200",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {mode === "signup" && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Password must contain uppercase, lowercase, and a number
                  </p>
                )}
              </div>
            )}

            {/* Confirm Password field (reset only) */}
            {mode === "reset" && (
              <div className="space-y-2 animate-slide-up">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                    size={20}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className={cn(
                      "w-full pl-12 pr-4 py-3.5 rounded-xl",
                      "bg-[var(--color-surface-hover)] border border-[var(--color-border)]",
                      "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                      "focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10",
                      "transition-all duration-200",
                    )}
                  />
                </div>
              </div>
            )}

            {/* Forgot Password Link (login only) */}
            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-scale-in">
                {error}
              </div>
            )}

            {/* Success message */}
            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-scale-in">
                {successMessage}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all",
                "bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600",
                "text-white shadow-lg shadow-emerald-500/20",
                "active:scale-[0.98]",
                loading && "opacity-70 cursor-not-allowed",
              )}
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {mode === "login"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : mode === "forgot"
                        ? "Send Code"
                        : "Reset Password"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider (login/signup only) */}
          {(mode === "login" || mode === "signup") && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--color-border)]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--color-surface)] px-3 text-[var(--color-text-muted)]">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* OAuth buttons */}
              <div className="space-y-3">
                {/* Google Sign In */}
                {onGoogleLogin && (
                  <button
                    type="button"
                    onClick={onGoogleLogin}
                    disabled={loading}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-medium transition-all",
                      "bg-white hover:bg-gray-50 border border-gray-200",
                      "text-gray-700",
                      "active:scale-[0.98]",
                      loading && "opacity-70 cursor-not-allowed",
                    )}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </button>
                )}

                {/* Apple Sign In */}
                {onAppleLogin && (
                  <button
                    type="button"
                    onClick={onAppleLogin}
                    disabled={loading}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-medium transition-all",
                      "bg-black hover:bg-gray-900 border border-black",
                      "text-white",
                      "active:scale-[0.98]",
                      loading && "opacity-70 cursor-not-allowed",
                    )}
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                    Continue with Apple
                  </button>
                )}
              </div>
            </>
          )}

          {/* Switch mode / Back to login */}
          <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center">
            {mode === "login" || mode === "signup" ? (
              <p className="text-[var(--color-text-secondary)]">
                {mode === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={() =>
                    switchMode(mode === "login" ? "signup" : "login")
                  }
                  className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            ) : (
              <button
                onClick={() => switchMode("login")}
                className="flex items-center justify-center gap-2 mx-auto text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Sign in
              </button>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
