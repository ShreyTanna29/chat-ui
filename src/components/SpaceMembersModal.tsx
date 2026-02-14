import { useEffect, useState } from "react";
import {
  X,
  Users,
  Search,
  UserPlus,
  Loader2,
  Crown,
  Shield,
  User as UserIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Space } from "@/services/spaces";
import {
  searchUsers,
  getSpaceMembers,
  addSpaceMember,
  removeSpaceMember,
  updateMemberRole,
  type User,
  type SpaceMember,
} from "@/services/spaceMembers";

interface SpaceMembersModalProps {
  space: Space;
  onClose: () => void;
  onMembersUpdated?: () => void;
}

export function SpaceMembersModal({
  space,
  onClose,
  onMembersUpdated,
}: SpaceMembersModalProps) {
  const [owner, setOwner] = useState<SpaceMember | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const canManageMembers =
    space.userRole === "owner" || space.userRole === "admin";
  const canUpdateRoles = space.userRole === "owner";

  // Load members
  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    const result = await getSpaceMembers(space.id);
    if (result.success && result.data) {
      setOwner(result.data.owner);
      setMembers(result.data.members);
    } else {
      setError(result.message || "Failed to load members");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space.id]);

  // Search users
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearching(true);
        const result = await searchUsers(searchQuery);
        if (result.success && result.users) {
          // Filter out users already in the space
          const memberIds = new Set([
            owner?.userId,
            ...members.map((m) => m.userId || m.id),
          ]);
          const filteredResults = result.users.filter(
            (user) => !memberIds.has(user.id),
          );
          setSearchResults(filteredResults);
        } else {
          setSearchResults([]);
        }
        setSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, owner, members]);

  const handleAddMember = async (
    userId: string,
    role: "member" | "admin" = "member",
  ) => {
    setAddingUserId(userId);
    const result = await addSpaceMember(space.id, userId, role);
    setAddingUserId(null);

    if (result.success) {
      await loadMembers();
      setSearchQuery("");
      setSearchResults([]);
      onMembersUpdated?.();
    } else {
      alert(result.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    setRemovingUserId(userId);
    const result = await removeSpaceMember(space.id, userId);
    setRemovingUserId(null);

    if (result.success) {
      await loadMembers();
      onMembersUpdated?.();
    } else {
      alert(result.message || "Failed to remove member");
    }
  };

  const handleUpdateRole = async (
    userId: string,
    newRole: "member" | "admin",
  ) => {
    setUpdatingUserId(userId);
    const result = await updateMemberRole(space.id, userId, newRole);
    setUpdatingUserId(null);

    if (result.success) {
      await loadMembers();
      onMembersUpdated?.();
    } else {
      alert(result.message || "Failed to update role");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown size={14} className="text-amber-500" />;
      case "admin":
        return <Shield size={14} className="text-blue-500" />;
      default:
        return <UserIcon size={14} className="text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "admin":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Users size={20} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Space Members
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                {space.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-surface-hover)] rounded-xl transition-colors"
          >
            <X size={18} className="text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Add member section */}
          {canManageMembers && (
            <div className="bg-[var(--color-surface-hover)] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus size={16} className="text-emerald-500" />
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Invite Members
                </h3>
              </div>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              {/* Search results */}
              {searching && (
                <div className="flex items-center justify-center py-4 text-sm text-[var(--color-text-muted)]">
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Searching...
                </div>
              )}

              {!searching && searchResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <UserIcon size={16} className="text-emerald-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(user.id)}
                        disabled={addingUserId === user.id}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                          "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
                          "hover:bg-emerald-500/20 transition-colors",
                          addingUserId === user.id &&
                            "opacity-50 cursor-not-allowed",
                        )}
                      >
                        {addingUserId === user.id ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <UserPlus size={12} />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!searching &&
                searchQuery.trim().length >= 2 &&
                searchResults.length === 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] text-center py-4">
                    No users found
                  </p>
                )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Members list */}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-[var(--color-text-muted)]">
              <Loader2 size={18} className="animate-spin mr-2" />
              Loading members...
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                Members ({members.length + 1})
              </h3>

              {/* Owner */}
              {owner && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {owner.user?.avatar || owner.avatar ? (
                        <img
                          src={owner.user?.avatar || owner.avatar || ""}
                          alt={owner.user?.name || owner.name}
                          className="w-9 h-9 rounded-full object-cover border-2 border-amber-500/30"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center border-2 border-amber-500/30">
                          <Crown size={16} className="text-amber-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {owner.user?.name || owner.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                          {owner.user?.email || owner.email}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
                        getRoleBadgeColor("owner"),
                      )}
                    >
                      {getRoleIcon("owner")}
                      Owner
                    </div>
                  </div>
                </div>
              )}

              {/* Other members */}
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-xl"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {member.user?.avatar || member.avatar ? (
                          <img
                            src={member.user?.avatar || member.avatar || ""}
                            alt={member.user?.name || member.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <UserIcon size={16} className="text-emerald-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {member.user?.name || member.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] truncate">
                            {member.user?.email || member.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Role badge/selector */}
                        {canUpdateRoles ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleUpdateRole(
                                member.userId || member.id,
                                e.target.value as "member" | "admin",
                              )
                            }
                            disabled={
                              updatingUserId === (member.userId || member.id)
                            }
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-medium border appearance-none cursor-pointer",
                              getRoleBadgeColor(member.role),
                              "hover:opacity-80 transition-opacity",
                              updatingUserId === (member.userId || member.id) &&
                                "opacity-50",
                            )}
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <div
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
                              getRoleBadgeColor(member.role),
                            )}
                          >
                            {getRoleIcon(member.role)}
                            {member.role.charAt(0).toUpperCase() +
                              member.role.slice(1)}
                          </div>
                        )}

                        {/* Remove button */}
                        {canManageMembers && (
                          <button
                            onClick={() =>
                              handleRemoveMember(member.userId || member.id)
                            }
                            disabled={
                              removingUserId === (member.userId || member.id)
                            }
                            className={cn(
                              "p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors",
                              removingUserId === (member.userId || member.id) &&
                                "opacity-50",
                            )}
                            title="Remove member"
                          >
                            {removingUserId === (member.userId || member.id) ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {members.length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-4">
                  No members yet. Invite someone to collaborate!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
