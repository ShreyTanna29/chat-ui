import { useEffect, useState } from "react";
import {
  Folder,
  FolderPlus,
  MessageSquare,
  Trash2,
  ArrowLeft,
  Loader2,
  PencilLine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Space,
  getSpaces,
  createSpace,
  updateSpace,
  deleteSpace,
  getSpaceConversations,
} from "@/services/spaces";
import type { Conversation } from "@/services/conversations";
import { deleteConversation } from "@/services/conversations";

interface SpacesSectionProps {
  onOpenConversation: (
    conversationId: string,
    spaceId?: string,
    spaceName?: string
  ) => void;
  onStartNewChatInSpace: (spaceId: string, spaceName: string) => void;
  onBackToChat: () => void;
}

export function SpacesSection({
  onOpenConversation,
  onStartNewChatInSpace,
  onBackToChat,
}: SpacesSectionProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState<string | null>(null);

  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [spaceConversations, setSpaceConversations] = useState<Conversation[]>(
    []
  );
  const [conversationsLoading, setConversationsLoading] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrompt, setEditPrompt] = useState("");

  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId) || null;

  const loadSpaces = async () => {
    setSpacesLoading(true);
    setSpacesError(null);
    const result = await getSpaces();
    if (result.success && result.spaces) {
      setSpaces(result.spaces);
    } else {
      setSpacesError(result.message || "Failed to load spaces");
    }
    setSpacesLoading(false);
  };

  const loadConversations = async (spaceId: string) => {
    setConversationsLoading(true);
    const result = await getSpaceConversations(spaceId);
    if (result.success && result.conversations) {
      setSpaceConversations(result.conversations);
    } else {
      setSpaceConversations([]);
    }
    setConversationsLoading(false);
  };

  useEffect(() => {
    void loadSpaces();
  }, []);

  const handleSelectSpace = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    setSpaceConversations([]);
    void loadConversations(spaceId);
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsCreating(true);
    const result = await createSpace({
      name: newName.trim(),
      defaultPrompt: newPrompt.trim() || undefined,
    });

    if (result.success && result.space) {
      setSpaces((prev) => [result.space!, ...prev]);
      setNewName("");
      setNewPrompt("");
    }
    setIsCreating(false);
  };

  const startEditSpace = (space: Space) => {
    setEditingSpaceId(space.id);
    setEditName(space.name);
    setEditPrompt(space.defaultPrompt || "");
  };

  const handleUpdateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpaceId) return;

    const result = await updateSpace(editingSpaceId, {
      name: editName.trim() || undefined,
      defaultPrompt: editPrompt.trim() || null,
    });

    if (result.success && result.space) {
      setSpaces((prev) =>
        prev.map((s) => (s.id === result.space!.id ? result.space! : s))
      );
      setEditingSpaceId(null);
    }
  };

  const handleDeleteSpace = async (space: Space) => {
    const confirmed = window.confirm(
      `Delete space "${space.name}"? Conversations will be kept but detached from this space.`
    );
    if (!confirmed) return;

    const result = await deleteSpace(space.id);
    if (result.success) {
      setSpaces((prev) => prev.filter((s) => s.id !== space.id));
      if (selectedSpaceId === space.id) {
        setSelectedSpaceId(null);
        setSpaceConversations([]);
      }
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const confirmed = window.confirm("Delete this conversation?");
    if (!confirmed) return;

    const result = await deleteConversation(conversationId);
    if (result.success) {
      setSpaceConversations((prev) =>
        prev.filter((c) => c.id !== conversationId)
      );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col px-4 sm:px-8 py-4 gap-4 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToChat}
              className="inline-flex items-center justify-center p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-hover)] text-[var(--color-text-secondary)]"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Folder className="text-emerald-400" size={22} />
                <h1 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)]">
                  Spaces
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                Organize conversations into focused workspaces with their own
                default prompts.
              </p>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 flex-1 min-h-0">
          {/* Left column: spaces list & create */}
          <div className="flex flex-col min-h-0 gap-3">
            {/* Create space card */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/40">
                    <FolderPlus size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      New space
                    </h2>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Group related conversations together with a shared
                      instruction.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateSpace} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Space name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Work projects"
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Default prompt (optional)
                  </label>
                  <textarea
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder="Describe how Erudite should behave in this space."
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreating || !newName.trim()}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium",
                    "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-500/30",
                    "hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.98]",
                    (isCreating || !newName.trim()) && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FolderPlus size={14} />
                      Create space
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Spaces list */}
            <div className="flex-1 min-h-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-3 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-[0.16em]">
                  Your spaces
                </span>
                <button
                  onClick={() => void loadSpaces()}
                  className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                >
                  Refresh
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {spacesLoading ? (
                  <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">
                    <Loader2 size={18} className="animate-spin mr-2" /> Loading
                    spaces...
                  </div>
                ) : spacesError ? (
                  <div className="text-xs text-red-400 p-3 bg-red-500/5 rounded-xl border border-red-500/20">
                    {spacesError}
                  </div>
                ) : spaces.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-center text-xs text-[var(--color-text-muted)] px-4">
                    <Folder size={22} className="mb-2 opacity-60" />
                    <p>No spaces yet. Create one to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {spaces.map((space) => {
                      const isSelected = selectedSpaceId === space.id;
                      return (
                        <button
                          key={space.id}
                          onClick={() => handleSelectSpace(space.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left group border text-xs sm:text-sm",
                            isSelected
                              ? "bg-[var(--color-surface-active)] border-[var(--color-border-hover)] shadow-sm"
                              : "bg-transparent border-transparent hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border)]"
                          )}
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/40">
                            <Folder size={16} className="text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="truncate font-medium text-[var(--color-text-primary)]">
                                {space.name}
                              </span>
                              {space._count?.conversations ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/40">
                                  {space._count.conversations} conv
                                </span>
                              ) : null}
                            </div>
                            {space.defaultPrompt && (
                              <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                                {space.defaultPrompt}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditSpace(space);
                              }}
                              className="p-1.5 rounded-lg hover:bg-[var(--color-surface-active)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                            >
                              <PencilLine size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteSpace(space);
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column: selected space details & conversations */}
          <div className="flex flex-col min-h-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 gap-3">
            {!selectedSpace ? (
              <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-hover)] flex items-center justify-center mb-4 border border-[var(--color-border)]">
                  <Folder className="text-[var(--color-text-muted)]" size={26} />
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)] mb-1">
                  Select a space
                </h2>
                <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-xs">
                  Choose a space on the left to see its conversations and start
                  new chats within that context.
                </p>
              </div>
            ) : (
              <>
                {/* Space header & edit form */}
                <div className="border-b border-[var(--color-border)] pb-3 mb-2">
                  {editingSpaceId === selectedSpace.id ? (
                    <form
                      onSubmit={handleUpdateSpace}
                      className="space-y-2 animate-slide-up"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/40">
                          <Folder size={16} className="text-emerald-400" />
                        </div>
                        <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                          Editing space
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                          Default prompt
                        </label>
                        <textarea
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs sm:text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 resize-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 shadow-md shadow-emerald-500/30"
                        >
                          Save changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSpaceId(null)}
                          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center border border-emerald-500/40">
                          <Folder size={16} className="text-emerald-400" />
                        </div>
                        <h2 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)]">
                          {selectedSpace.name}
                        </h2>
                      </div>
                      {selectedSpace.defaultPrompt && (
                        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
                          {selectedSpace.defaultPrompt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            onStartNewChatInSpace(
                              selectedSpace.id,
                              selectedSpace.name
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white text-xs font-medium hover:from-emerald-500 hover:to-emerald-600 shadow-md shadow-emerald-500/30"
                        >
                          <MessageSquare size={14} />
                          New chat in this space
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditSpace(selectedSpace)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] text-xs font-medium hover:text-[var(--color-text-primary)] border border-[var(--color-border)]"
                        >
                          <PencilLine size={14} /> Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Conversations list */}
                <div className="flex-1 min-h-0 flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-[0.16em]">
                      Conversations in this space
                    </span>
                    {selectedSpace._count?.conversations ? (
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {selectedSpace._count.conversations} total
                      </span>
                    ) : null}
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1">
                    {conversationsLoading ? (
                      <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Loading conversations...
                      </div>
                    ) : spaceConversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-center text-xs text-[var(--color-text-muted)] px-4">
                        <MessageSquare size={22} className="mb-2 opacity-60" />
                        <p>
                          No conversations yet in this space. Start a new chat
                          with the button above.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {spaceConversations.map((conv) => (
                          <div
                            key={conv.id}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]/60 text-xs sm:text-sm"
                          >
                            <div className="w-8 h-8 rounded-xl bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0 border border-[var(--color-border)]">
                              <MessageSquare
                                size={16}
                                className="text-[var(--color-text-muted)]"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium text-[var(--color-text-primary)]">
                                {conv.title}
                              </p>
                              <p className="text-[11px] text-[var(--color-text-muted)]">
                                {new Date(conv.updatedAt || conv.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenConversation(
                                    conv.id,
                                    selectedSpace.id,
                                    selectedSpace.name
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-secondary)] text-[11px] hover:text-[var(--color-text-primary)] border border-[var(--color-border)]"
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteConversation(conv.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
