import {
  Copy,
  Check,
  Sparkles,
  User,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Share2,
  Reply,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  onAskErudite?: (text: string) => void;
}

export function ChatMessage({
  role,
  content,
  isLoading,
  onAskErudite,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [selection, setSelection] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        selection &&
        !(e.target as HTMLElement).closest(".ask-erudite-tooltip")
      ) {
        setSelection(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selection]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMouseUp = () => {
    if (role === "user") return;

    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed) {
      setSelection(null);
      return;
    }

    const text = windowSelection.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    // Ensure selection is within this message
    if (
      contentRef.current &&
      !contentRef.current.contains(windowSelection.anchorNode)
    ) {
      return;
    }

    const range = windowSelection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelection({
      text,
      top: rect.top,
      left: rect.left + rect.width / 2,
    });
  };

  const handleAskErudite = () => {
    if (selection && onAskErudite) {
      onAskErudite(selection.text);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const isUser = role === "user";

  return (
    <div
      className={cn(
        "w-full py-8 animate-slide-up relative",
        isUser
          ? "bg-transparent"
          : "bg-gradient-to-b from-[var(--color-surface)]/30 to-transparent border-t border-[var(--color-border)]/50"
      )}
    >
      {/* Ask Erudite Tooltip */}
      {selection && (
        <div
          className="ask-erudite-tooltip fixed z-50 animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: `${selection.top - 45}px`,
            left: `${selection.left}px`,
            transform: "translateX(-50%)",
          }}
        >
          <button
            onClick={handleAskErudite}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl hover:bg-[var(--color-surface-hover)] transition-colors text-sm font-medium text-[var(--color-text-primary)]"
          >
            <Reply size={16} className="text-emerald-400" />
            Ask Erudite
          </button>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--color-surface)] border-b border-r border-[var(--color-border)] rotate-45" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 flex gap-4">
        {/* Avatar */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg",
            isUser
              ? "bg-gradient-to-br from-gray-700 to-gray-800 border border-[var(--color-border)] group-hover:shadow-gray-500/20"
              : "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30 animate-float"
          )}
        >
          {isUser ? (
            <User size={18} className="text-gray-300" />
          ) : (
            <>
              <Sparkles size={18} className="text-white" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent" />
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 group">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="font-semibold text-sm text-[var(--color-text-primary)]">
              {isUser ? "You" : "Erudite"}
            </span>
            {!isUser && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                AI
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 py-3">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"
                  style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
                />
                <div
                  className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"
                  style={{
                    animation: "pulse-dot 1.4s ease-in-out 0.2s infinite",
                  }}
                />
                <div
                  className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"
                  style={{
                    animation: "pulse-dot 1.4s ease-in-out 0.4s infinite",
                  }}
                />
              </div>
              <span className="text-sm text-[var(--color-text-muted)] font-medium">
                Thinking...
              </span>
            </div>
          ) : (
            <>
              <div
                ref={contentRef}
                onMouseUp={handleMouseUp}
                className={cn(
                  "text-[var(--color-text-primary)] leading-[1.75] whitespace-pre-wrap",
                  "text-[15px]"
                )}
              >
                {content}
              </div>

              {/* Actions - enhanced */}
              {!isUser && (
                <div className="mt-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-slide-up">
                  <button
                    onClick={handleCopy}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                      "border border-[var(--color-border)] hover:border-[var(--color-border-hover)]",
                      "hover:bg-[var(--color-surface)] active:scale-95",
                      copied
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                        : "text-[var(--color-text-secondary)]"
                    )}
                    title="Copy"
                  >
                    {copied ? (
                      <>
                        <Check size={14} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <div className="w-px h-5 bg-[var(--color-border)]" />

                  <button
                    onClick={() => setFeedback(feedback === "up" ? null : "up")}
                    className={cn(
                      "p-2 rounded-xl transition-all border",
                      "hover:bg-[var(--color-surface)] active:scale-95",
                      feedback === "up"
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                        : "text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-secondary)]"
                    )}
                    title="Good response"
                  >
                    <ThumbsUp size={14} />
                  </button>

                  <button
                    onClick={() =>
                      setFeedback(feedback === "down" ? null : "down")
                    }
                    className={cn(
                      "p-2 rounded-xl transition-all border",
                      "hover:bg-[var(--color-surface)] active:scale-95",
                      feedback === "down"
                        ? "text-red-400 bg-red-500/10 border-red-500/30"
                        : "text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-secondary)]"
                    )}
                    title="Bad response"
                  >
                    <ThumbsDown size={14} />
                  </button>

                  <button
                    className={cn(
                      "p-2 rounded-xl transition-all border border-[var(--color-border)]",
                      "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                      "hover:bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]",
                      "active:scale-95"
                    )}
                    title="Regenerate"
                  >
                    <RotateCcw size={14} />
                  </button>

                  <button
                    className={cn(
                      "p-2 rounded-xl transition-all border border-[var(--color-border)]",
                      "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                      "hover:bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]",
                      "active:scale-95"
                    )}
                    title="Share"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
