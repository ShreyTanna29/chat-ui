import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, MessageSquare, ArrowRight, AlertCircle } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { cn } from "@/lib/utils";
import {
  getSharedConversation,
  SharedConversation,
} from "@/services/sharedChats";

export function SharedChatPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<SharedConversation | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedChat = async () => {
      if (!shareId) {
        setError("Invalid share link");
        setIsLoading(false);
        return;
      }

      const result = await getSharedConversation(shareId);

      if (result.success && result.conversation) {
        setConversation(result.conversation);
      } else {
        setError(result.message || "Chat not found");
      }

      setIsLoading(false);
    };

    loadSharedChat();
  }, [shareId]);

  const handleStartChat = () => {
    navigate("/");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-float overflow-hidden">
            <img
              src="/logo.jpg"
              alt="Erudite Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <Loader2 size={24} className="text-emerald-400 animate-spin" />
          <p className="text-sm text-[var(--color-text-muted)]">
            Loading shared chat...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
            Chat Not Found
          </h1>
          <p className="text-[var(--color-text-muted)] mb-6">{error}</p>
          <button
            onClick={handleStartChat}
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
              "bg-gradient-to-r from-emerald-500 to-emerald-600",
              "hover:from-emerald-400 hover:to-emerald-500",
              "text-white shadow-lg shadow-emerald-500/25",
              "active:scale-[0.98]",
            )}
          >
            Start Your Own Chat
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Success - show the shared chat
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-background)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 overflow-hidden">
              <img
                src="/logo.jpg"
                alt="Erudite Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="font-semibold text-[var(--color-text-primary)]">
                Erudite
              </h1>
              <p className="text-xs text-[var(--color-text-muted)]">
                Shared Conversation
              </p>
            </div>
          </div>
          <button
            onClick={handleStartChat}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all",
              "bg-gradient-to-r from-emerald-500 to-emerald-600",
              "hover:from-emerald-400 hover:to-emerald-500",
              "text-white shadow-lg shadow-emerald-500/25",
              "active:scale-[0.98]",
            )}
          >
            <MessageSquare size={16} />
            Start Your Own Chat
          </button>
        </div>
      </header>

      {/* Chat Title */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
            {conversation?.title || "Shared Conversation"}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Shared on{" "}
            {conversation?.sharedAt
              ? new Date(conversation.sharedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Unknown date"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="pb-20">
        {conversation?.messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            metadata={
              message.metadata as {
                hasImage?: boolean;
                imageUrl?: string;
                hasDocument?: boolean;
                documentUrl?: string;
                documentName?: string;
                generatedImages?: Array<{
                  url: string;
                  revised_prompt?: string;
                }>;
              }
            }
          />
        ))}
      </div>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--color-background)] via-[var(--color-background)] to-transparent pt-8 pb-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-xl">
            <p className="text-[var(--color-text-secondary)] mb-4">
              Want to have your own conversation with Erudite?
            </p>
            <button
              onClick={handleStartChat}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                "bg-gradient-to-r from-emerald-500 to-emerald-600",
                "hover:from-emerald-400 hover:to-emerald-500",
                "text-white shadow-lg shadow-emerald-500/25",
                "active:scale-[0.98]",
              )}
            >
              Start Your Own Chat
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
