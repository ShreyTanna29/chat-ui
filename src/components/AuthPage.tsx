import { useState, FormEvent } from "react";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthPageProps {
  onLogin: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  onSignup: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  isLoading?: boolean;
}

export function AuthPage({
  onLogin,
  onSignup,
  isLoading = false,
}: AuthPageProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLoginMode) {
      const result = await onLogin(email, password);
      if (!result.success) {
        setError(result.message || "Login failed");
      }
    } else {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      const result = await onSignup(name, email, password);
      if (!result.success) {
        setError(result.message || "Signup failed");
      }
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setError("");
    setPassword("");
  };

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
              {isLoginMode ? "Welcome back" : "Create account"}
            </span>
          </h1>
          <p className="text-[var(--color-text-secondary)]">
            {isLoginMode
              ? "Sign in to continue your journey with Erudite"
              : "Start your journey with Erudite AI assistant"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name field (signup only) */}
            {!isLoginMode && (
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
                    required={!isLoginMode}
                    className={cn(
                      "w-full pl-12 pr-4 py-3.5 rounded-xl",
                      "bg-[var(--color-surface-hover)] border border-[var(--color-border)]",
                      "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                      "focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10",
                      "transition-all duration-200"
                    )}
                  />
                </div>
              </div>
            )}

            {/* Email field */}
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
                  className={cn(
                    "w-full pl-12 pr-4 py-3.5 rounded-xl",
                    "bg-[var(--color-surface-hover)] border border-[var(--color-border)]",
                    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                    "focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10",
                    "transition-all duration-200"
                  )}
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                Password
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
                    "transition-all duration-200"
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
              {!isLoginMode && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Password must contain uppercase, lowercase, and a number
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-scale-in">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all",
                "bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600",
                "text-white shadow-lg shadow-emerald-500/20",
                "active:scale-[0.98]",
                isLoading && "opacity-70 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {isLoginMode ? "Sign in" : "Create account"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Switch mode */}
          <div className="mt-6 pt-6 border-t border-[var(--color-border)] text-center">
            <p className="text-[var(--color-text-secondary)]">
              {isLoginMode
                ? "Don't have an account? "
                : "Already have an account? "}
              <button
                onClick={switchMode}
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                {isLoginMode ? "Sign up" : "Sign in"}
              </button>
            </p>
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
