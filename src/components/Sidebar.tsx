import { useState } from "react";
import {
  Plus,
  MessageSquare,
  MoreHorizontal,
  Menu,
  X,
  Trash2,
  Crown,
  LogOut,
  Folder,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  date: string;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onLogout?: () => void;
  userName?: string;
  isOpen: boolean;
  onToggle: () => void;
  // Spaces
  isSpacesView?: boolean;
  onShowSpaces?: () => void;
  onShowChat?: () => void;
  // Discover
  onShowDiscover?: () => void;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onLogout,
  userName = "User",
  isOpen,
  onToggle,
  isSpacesView,
  onShowSpaces,
  onShowChat,
  onShowDiscover,
}: SidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative z-50 h-full w-[280px] flex flex-col",
          "bg-[var(--color-sidebar)] border-r border-[var(--color-border)]",
          "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 p-5 space-y-5">
          {/* Logo row */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 overflow-hidden">
                <img
                  src="/logo.jpg"
                  alt="Erudite Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-lg text-[var(--color-text-primary)] tracking-tight">
                Erudite
              </span>
            </div>

            <button
              onClick={onToggle}
              className="md:hidden p-2 rounded-lg hover:bg-[var(--color-surface)] transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* New chat button */}
          <button
            onClick={onNewChat}
            className={cn(
              "w-full flex items-center justify-center gap-2.5 px-4 h-12 rounded-xl transition-all group",
              "bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-hover)]",
              "border border-[var(--color-border)] hover:border-[var(--color-border-hover)]",
              "shadow-sm hover:shadow-md active:scale-[0.98]",
              "text-[15px] font-semibold text-[var(--color-text-primary)]",
            )}
          >
            <Plus
              size={20}
              className="text-emerald-400 group-hover:rotate-90 transition-transform duration-300"
            />
            <span>New chat</span>
          </button>

          {/* Discover button */}
          <button
            onClick={onShowDiscover}
            className={cn(
              "w-full flex items-center justify-center gap-2.5 px-4 h-11 rounded-xl transition-all group mt-2",
              "bg-gradient-to-br from-blue-500/10 to-indigo-500/10",
              "border border-blue-500/20 hover:border-blue-400/40",
              "shadow-sm hover:shadow-md hover:shadow-blue-500/10 active:scale-[0.98]",
              "text-[14px] font-medium text-[var(--color-text-secondary)] hover:text-blue-400",
            )}
          >
            <Compass
              size={18}
              className="text-blue-400 group-hover:rotate-45 transition-transform duration-300"
            />
            <span>Discover</span>
          </button>

          {/* View toggle: Chat vs Spaces */}
          <div className="mt-4 flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <button
              type="button"
              onClick={onShowChat}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium",
                !isSpacesView
                  ? "bg-[var(--color-surface-active)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]",
              )}
            >
              <MessageSquare size={14} />
              <span>Chat</span>
            </button>
            <button
              type="button"
              onClick={onShowSpaces}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium",
                isSpacesView
                  ? "bg-[var(--color-surface-active)] text-[var(--color-text-primary)] shadow-sm"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]",
              )}
            >
              <Folder size={14} />
              <span>Spaces</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex-shrink-0 px-5">
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto py-4 px-4">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60%] text-center px-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-hover)] flex items-center justify-center mb-5 border border-[var(--color-border)] shadow-inner">
                <MessageSquare
                  size={32}
                  className="text-[var(--color-text-muted)] opacity-50"
                />
              </div>
              <p className="text-[var(--color-text-primary)] text-base font-semibold mb-2">
                No conversations yet
              </p>
              <p className="text-[var(--color-text-muted)] text-sm leading-relaxed max-w-[180px]">
                Start a new chat to begin your journey with Erudite
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv, index) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ animationDelay: `${index * 40}ms` }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all group relative",
                    activeConversationId === conv.id
                      ? "bg-gradient-to-br from-[var(--color-surface-active)] to-[var(--color-surface-hover)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]/50"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] border border-transparent",
                  )}
                >
                  {/* Active indicator */}
                  {activeConversationId === conv.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-r-full shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
                  )}

                  <MessageSquare
                    size={18}
                    className={cn(
                      "flex-shrink-0 transition-colors",
                      activeConversationId === conv.id
                        ? "text-emerald-400"
                        : "opacity-70 group-hover:opacity-100",
                    )}
                  />
                  <span className="flex-1 truncate text-sm font-medium tracking-wide">
                    {conv.title}
                  </span>

                  {/* Action buttons */}
                  <div
                    className={cn(
                      "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bg-gradient-to-l from-[var(--color-surface-hover)] to-transparent pl-4",
                      hoveredId === conv.id ? "opacity-100" : "",
                    )}
                  >
                    <button
                      className="p-1.5 rounded-lg hover:bg-[var(--color-surface-active)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    <button
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation?.(conv.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex-shrink-0 px-5">
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-5">
          <div
            className={cn(
              "w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-2xl transition-all group",
              "hover:bg-[var(--color-surface)] relative overflow-hidden border border-transparent hover:border-[var(--color-border)] cursor-default",
            )}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity animate-shimmer" />

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-emerald-500/20">
                {userName.charAt(0).toUpperCase()}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-400 border-[3px] border-[var(--color-sidebar)] shadow-sm" />
            </div>

            {/* User info */}
            <div className="flex-1 text-left relative min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[15px] font-semibold text-[var(--color-text-primary)] truncate">
                  {userName}
                </span>
                <Crown size={14} className="text-amber-400 flex-shrink-0" />
              </div>
              <div className="text-xs text-[var(--color-text-muted)] font-medium">
                Free plan
              </div>
            </div>

            {/* Logout icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLogout?.();
              }}
              className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-colors cursor-pointer relative z-10"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed top-4 left-4 z-30 p-3 rounded-xl transition-all duration-300 md:hidden",
          "bg-[var(--color-surface)] border border-[var(--color-border)]",
          "hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-hover)]",
          "shadow-lg hover:shadow-xl active:scale-95",
          isOpen && "opacity-0 pointer-events-none scale-90",
        )}
      >
        <Menu size={20} />
      </button>
    </>
  );
}
