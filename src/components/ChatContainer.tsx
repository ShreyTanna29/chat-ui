import { useRef, useEffect, useState } from "react";
import {
  Code,
  Lightbulb,
  BookOpen,
  Zap,
  ArrowUpRight,
  Folder,
  MessageSquare,
} from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput, ChatMode } from "./ChatInput";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent?: string;
  /** Optional space name if this chat is associated with a space */
  spaceName?: string;
  /** Optional conversation title for context */
  conversationTitle?: string;
  onSend: (
    message: string,
    image?: File,
    document?: File,
    mode?: ChatMode
  ) => void;
}

const suggestions = [
  {
    icon: Code,
    title: "Help me debug",
    description: "my Python code that's throwing an error",
    gradient: "var(--gradient-blue)",
    borderGradient: "from-blue-500/40 via-blue-500/20 to-transparent",
    iconBg: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    glowColor: "rgba(59, 130, 246, 0.15)",
    tag: "Coding",
  },
  {
    icon: Lightbulb,
    title: "Generate ideas",
    description: "for a weekend side project",
    gradient: "var(--gradient-amber)",
    borderGradient: "from-amber-500/40 via-amber-500/20 to-transparent",
    iconBg: "from-amber-500/20 to-amber-600/10",
    iconColor: "text-amber-400",
    glowColor: "rgba(245, 158, 11, 0.15)",
    tag: "Ideas",
  },
  {
    icon: BookOpen,
    title: "Explain",
    description: "how quantum computing works",
    gradient: "var(--gradient-purple)",
    borderGradient: "from-purple-500/40 via-purple-500/20 to-transparent",
    iconBg: "from-purple-500/20 to-purple-600/10",
    iconColor: "text-purple-400",
    glowColor: "rgba(168, 85, 247, 0.15)",
    tag: "Learn",
  },
  {
    icon: Zap,
    title: "Write a creative",
    description: "story about space exploration",
    gradient: "var(--gradient-emerald)",
    borderGradient: "from-emerald-500/40 via-emerald-500/20 to-transparent",
    iconBg: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
    glowColor: "rgba(16, 185, 129, 0.15)",
    tag: "Creative",
  },
];

export function ChatContainer({
  messages,
  isLoading,
  streamingContent = "",
  spaceName,
  conversationTitle,
  onSend,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [quotedText, setQuotedText] = useState<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  const handleSend = (
    message: string,
    image?: File,
    document?: File,
    quoted?: string,
    mode?: ChatMode
  ) => {
    // If there's a quoted text, prepend it as context
    if (quoted) {
      const fullMessage = message
        ? `Regarding: "${quoted}"

${message}`
        : `Explain this: "${quoted}"`;
      onSend(fullMessage, image, document, mode);
      setQuotedText(null);
    } else {
      onSend(message, image, document, mode);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex w-full flex-col justify-center items-center h-full bg-background relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none opacity-50" />

      {/* Context header: show space and conversation info if available */}
      {(spaceName || conversationTitle) && (
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 pt-4">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl bg-[var(--color-surface)]/90 border border-[var(--color-border)] shadow-md">
            <div className="flex items-center gap-2 overflow-hidden">
              {spaceName && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] max-w-[180px] sm:max-w-[220px] truncate">
                  <Folder
                    size={14}
                    className="text-emerald-400 flex-shrink-0"
                  />
                  <span className="truncate">{spaceName}</span>
                </div>
              )}
              {spaceName && conversationTitle && (
                <span className="text-[var(--color-text-muted)] text-xs px-1">
                  •
                </span>
              )}
              {conversationTitle && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] max-w-[200px] sm:max-w-[260px] truncate">
                  <MessageSquare
                    size={14}
                    className="text-[var(--color-text-muted)] flex-shrink-0"
                  />
                  <span className="truncate">{conversationTitle}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative z-10 scroll-smooth w-full"
      >
        {isEmpty ? (
          /* Welcome screen - Centered vertically */
          <div className="flex flex-col items-center justify-center h-full px-6 animate-fade-in py-10">
            {/* Logo with enhanced glow and orbit effect */}
            <div className="relative mb-8">
              {/* Orbit ring */}
              <div className="absolute inset-0 w-24 h-24 -translate-x-4 -translate-y-4">
                <div className="absolute inset-0 rounded-full border border-emerald-500/10 animate-[rotate-slow_20s_linear_infinite]" />
                <div className="absolute top-0 left-1/2 w-1.5 h-1.5 -ml-0.75 -mt-0.75 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)] animate-[rotate-slow_20s_linear_infinite]" />
              </div>

              {/* Main logo */}
              <div className="absolute inset-0 rounded-[20px] bg-gradient-to-br from-emerald-500 to-emerald-600 blur-2xl opacity-30 animate-glow-pulse" />
              <div className="relative w-16 h-16 rounded-[20px] bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20 animate-float overflow-hidden">
                <img
                  src="/logo.jpg"
                  alt="Erudite Logo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 rounded-[20px] bg-gradient-to-tr from-white/20 to-transparent" />
              </div>
            </div>

            {/* Title with enhanced gradient */}
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-center animate-slide-up tracking-tight leading-tight">
              <span className="gradient-text">How can I help you today?</span>
            </h1>
            <p
              className="text-[var(--color-text-secondary)] mb-10 text-center max-w-lg text-base animate-slide-up leading-relaxed"
              style={{ animationDelay: "100ms" }}
            >
              I'm{" "}
              <span className="font-semibold text-[var(--color-text-primary)]">
                Erudite
              </span>
              , your AI assistant. Ask me anything from complex coding questions
              to creative writing ideas.
            </p>

            {/* Premium redesigned suggestion cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-4xl mb-10">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() =>
                    onSend(`${suggestion.title} ${suggestion.description}`)
                  }
                  style={{ animationDelay: `${200 + index * 50}ms` }}
                  className={cn(
                    "group relative flex flex-col items-start gap-4 p-6 rounded-2xl text-left transition-all duration-500 animate-scale-in h-full overflow-hidden",
                    "hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]"
                  )}
                >
                  {/* Glassmorphic background layer */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl" />

                  {/* Animated gradient border */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(135deg, ${suggestion.glowColor.replace(
                        "0.15",
                        "0.3"
                      )}, transparent 60%)`,
                      padding: "1px",
                      WebkitMask:
                        "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    }}
                  />

                  {/* Static border */}
                  <div className="absolute inset-0 rounded-2xl border border-white/10 group-hover:border-transparent transition-colors duration-500" />

                  {/* Radial glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-2xl"
                    style={{
                      background: `radial-gradient(circle at 30% 30%, ${suggestion.glowColor.replace(
                        "0.15",
                        "0.25"
                      )}, transparent 60%)`,
                    }}
                  />

                  {/* Content container */}
                  <div className="relative z-10 w-full flex flex-col gap-4">
                    {/* Icon container with enhanced glow */}
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          "relative p-3 rounded-xl transition-all duration-500",
                          "bg-gradient-to-br from-white/10 to-white/5",
                          "border border-white/10",
                          "group-hover:scale-110 group-hover:rotate-3",
                          "shadow-lg"
                        )}
                        style={{
                          boxShadow: `0 4px 16px ${suggestion.glowColor.replace(
                            "0.15",
                            "0"
                          )}, 0 0 0 0 ${suggestion.glowColor.replace(
                            "0.15",
                            "0"
                          )}`,
                          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      >
                        {/* Icon glow effect on hover */}
                        <div
                          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md"
                          style={{
                            background: suggestion.glowColor.replace(
                              "0.15",
                              "0.4"
                            ),
                          }}
                        />
                        <suggestion.icon
                          size={22}
                          className={cn(
                            suggestion.iconColor,
                            "relative z-10 transition-all duration-500",
                            "group-hover:drop-shadow-[0_0_8px_currentColor]"
                          )}
                        />
                      </div>

                      {/* Arrow with smooth entrance */}
                      <ArrowUpRight
                        size={20}
                        className={cn(
                          suggestion.iconColor,
                          "opacity-0 scale-75 -translate-x-2 translate-y-2",
                          "transition-all duration-500",
                          "group-hover:opacity-70 group-hover:scale-100 group-hover:translate-x-0 group-hover:translate-y-0"
                        )}
                      />
                    </div>

                    {/* Text content with improved typography */}
                    <div className="flex flex-col gap-2">
                      <h3
                        className={cn(
                          "font-semibold text-base text-[var(--color-text-primary)]",
                          "transition-all duration-500",
                          "group-hover:translate-x-0.5"
                        )}
                      >
                        {suggestion.title}
                      </h3>
                      <p
                        className={cn(
                          "text-[var(--color-text-secondary)] text-sm leading-relaxed",
                          "opacity-70 group-hover:opacity-100",
                          "transition-all duration-500",
                          "group-hover:translate-x-0.5"
                        )}
                      >
                        {suggestion.description}
                      </p>
                    </div>

                    {/* Subtle accent line at bottom */}
                    <div
                      className="h-0.5 w-0 group-hover:w-full transition-all duration-700 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${suggestion.glowColor.replace(
                          "0.15",
                          "0.6"
                        )}, transparent)`,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages list */
          <div className="pb-8 pt-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                onAskErudite={(text) => setQuotedText(text)}
              />
            ))}
            {isLoading && (
              <ChatMessage
                role="assistant"
                content={streamingContent}
                isLoading={!streamingContent}
              />
            )}
          </div>
        )}
      </div>

      {/* Input area with enhanced gradient separator */}
      <div className="w-full flex justify-center mx-auto">
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          quotedText={quotedText || undefined}
          onClearQuote={() => setQuotedText(null)}
        />
      </div>
    </div>
  );
}
