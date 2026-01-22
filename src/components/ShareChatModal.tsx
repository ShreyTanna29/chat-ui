import { useState } from "react";
import { Copy, Check, X, Link2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { shareConversation } from "@/services/sharedChats";

interface ShareChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationTitle?: string;
}

export function ShareChatModal({
  isOpen,
  onClose,
  conversationId,
  conversationTitle,
}: ShareChatModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setIsLoading(true);
    setError(null);

    const result = await shareConversation(conversationId);

    if (result.success && result.data) {
      // Construct the full URL
      const fullUrl =
        result.data.shareUrl ||
        `${window.location.origin}/shared/${result.data.shareId}`;
      setShareUrl(fullUrl);
    } else {
      setError(result.message || "Failed to create share link");
    }

    setIsLoading(false);
  };

  const handleCopy = async () => {
    if (!shareUrl) return;

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setShareUrl(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md mx-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Link2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Share Chat
              </h2>
              {conversationTitle && (
                <p className="text-sm text-[var(--color-text-muted)] truncate max-w-[200px]">
                  {conversationTitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!shareUrl && !error && !isLoading && (
            <>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Create a shareable link to this conversation. Anyone with the
                link will be able to view this chat.
              </p>
              <button
                onClick={handleShare}
                className={cn(
                  "w-full py-3 px-4 rounded-xl font-medium transition-all",
                  "bg-gradient-to-r from-emerald-500 to-emerald-600",
                  "hover:from-emerald-400 hover:to-emerald-500",
                  "text-white shadow-lg shadow-emerald-500/25",
                  "active:scale-[0.98]",
                )}
              >
                Generate Share Link
              </button>
            </>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 size={32} className="text-emerald-400 animate-spin" />
              <p className="text-sm text-[var(--color-text-muted)]">
                Creating share link...
              </p>
            </div>
          )}

          {shareUrl && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-transparent text-sm text-[var(--color-text-primary)] outline-none truncate"
                />
                <button
                  onClick={handleCopy}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                    copied
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-emerald-500 text-white hover:bg-emerald-400",
                  )}
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] text-center">
                🔗 Anyone with this link can view this conversation
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={handleShare}
                className="mt-3 text-sm text-red-400 hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
