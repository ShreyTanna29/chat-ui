import { useState, useEffect } from "react";
import {
  X,
  User,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createReminder,
  getReminders,
  toggleReminder,
  deleteReminder,
  type Reminder,
} from "@/services/reminders";

interface SettingsPageProps {
  onClose: () => void;
  userName?: string;
  userAvatar?: string | null;
  userEmail?: string;
}

export function SettingsPage({
  onClose,
  userName = "User",
  userAvatar,
  userEmail,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<
    "profile" | "reminders" | "notifications" | "privacy" | "about"
  >("profile");

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "reminders" as const, label: "Reminders", icon: Clock },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "privacy" as const, label: "Privacy & Security", icon: Shield },
    { id: "about" as const, label: "About", icon: HelpCircle },
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--color-background)]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Settings
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Manage your account and preferences
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[var(--color-surface)] transition-all"
        >
          <X size={24} className="text-[var(--color-text-secondary)]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r border-[var(--color-border)] p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group",
                  activeTab === tab.id
                    ? "bg-[var(--color-surface-active)] text-[var(--color-text-primary)] shadow-sm"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
                )}
              >
                <Icon size={20} />
                <span className="flex-1 text-left font-medium">
                  {tab.label}
                </span>
                <ChevronRight
                  size={16}
                  className={cn(
                    "transition-opacity",
                    activeTab === tab.id
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-50"
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "profile" && (
            <ProfileSettings
              userName={userName}
              userAvatar={userAvatar}
              userEmail={userEmail}
            />
          )}
          {activeTab === "reminders" && <RemindersSettings />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "privacy" && <PrivacySettings />}
          {activeTab === "about" && <AboutSettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({
  userName,
  userAvatar,
  userEmail,
}: {
  userName?: string;
  userAvatar?: string | null;
  userEmail?: string;
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1">
          Profile Information
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Update your account profile information
        </p>
      </div>

      {/* Avatar Section */}
      <div className="flex items-center gap-6 p-6 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="relative">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-border)]"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {userName?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">
            Profile Picture
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Your profile picture is displayed across Erudite
          </p>
        </div>
      </div>

      {/* Name & Email */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Display Name
          </label>
          <input
            type="text"
            defaultValue={userName}
            className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Email
          </label>
          <input
            type="email"
            defaultValue={userEmail}
            className="w-full px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>
    </div>
  );
}

function RemindersSettings() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newReminder, setNewReminder] = useState({
    prompt: "",
    timezone: "UTC",
  });

  // Load reminders on mount
  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getReminders();
      if (response.success && response.data) {
        setReminders(response.data.reminders);
      } else {
        setError("Failed to load reminders");
      }
    } catch (err) {
      setError("Error loading reminders");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReminder = async () => {
    if (!newReminder.prompt.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      const response = await createReminder({
        prompt: newReminder.prompt,
        timezone: newReminder.timezone,
      });

      if (response.success && response.data) {
        setReminders((prev) => [...prev, response.data!.reminder]);
        setNewReminder({ prompt: "", timezone: "UTC" });
      } else {
        setError(response.message || "Failed to create reminder");
      }
    } catch (err) {
      setError("Error creating reminder");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleReminder = async (id: string) => {
    try {
      const response = await toggleReminder(id);
      if (response.success && response.data) {
        setReminders((prev) =>
          prev.map((r) => (r.id === id ? response.data!.reminder : r))
        );
      }
    } catch (err) {
      console.error("Error toggling reminder:", err);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const response = await deleteReminder(id);
      if (response.success) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Error deleting reminder:", err);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1">
          Reminders
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Manage your AI-powered reminders
        </p>
      </div>

      {/* Create New Reminder */}
      <div className="p-6 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] space-y-4">
        <h3 className="font-semibold text-[var(--color-text-primary)]">
          Create New Reminder
        </h3>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              What would you like to be reminded about?
            </label>
            <input
              type="text"
              placeholder="e.g., Give updates on the stock market daily at 5PM"
              value={newReminder.prompt}
              onChange={(e) =>
                setNewReminder({ ...newReminder, prompt: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCreateReminder();
                }
              }}
              disabled={isCreating}
              className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Timezone
            </label>
            <select
              value={newReminder.timezone}
              onChange={(e) =>
                setNewReminder({ ...newReminder, timezone: e.target.value })
              }
              disabled={isCreating}
              className="w-full px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New York</option>
              <option value="America/Los_Angeles">America/Los Angeles</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
            </select>
          </div>
          <button
            onClick={handleCreateReminder}
            disabled={!newReminder.prompt.trim() || isCreating}
            className="w-full px-4 py-3 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              "Create Reminder"
            )}
          </button>
        </div>
      </div>

      {/* Active Reminders */}
      <div className="space-y-3">
        <h3 className="font-semibold text-[var(--color-text-primary)]">
          Your Reminders
        </h3>

        {isLoading ? (
          <div className="p-8 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] text-center">
            <Loader2
              size={48}
              className="mx-auto mb-3 text-emerald-500 animate-spin"
            />
            <p className="text-[var(--color-text-secondary)]">
              Loading reminders...
            </p>
          </div>
        ) : reminders.length === 0 ? (
          <div className="p-8 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] text-center">
            <Clock
              size={48}
              className="mx-auto mb-3 text-[var(--color-text-muted)] opacity-50"
            />
            <p className="text-[var(--color-text-secondary)]">
              No reminders yet
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Create your first reminder using natural language above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-1">
                      {reminder.title}
                    </h4>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                      {reminder.prompt}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                      <span>Schedule: {reminder.schedule}</span>
                      <span>•</span>
                      <span>Timezone: {reminder.timezone}</span>
                      {reminder.lastRun && (
                        <>
                          <span>•</span>
                          <span>
                            Last run:{" "}
                            {new Date(reminder.lastRun).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleReminder(reminder.id)}
                      className="p-2 rounded-lg hover:bg-[var(--color-surface-active)] text-[var(--color-text-secondary)] transition-all"
                      title={reminder.isActive ? "Deactivate" : "Activate"}
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          reminder.isActive ? "bg-green-500" : "bg-gray-400"
                        )}
                      />
                    </button>
                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--color-text-secondary)] hover:text-red-400 transition-all"
                      title="Delete reminder"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-400">
          <strong>Tip:</strong> Reminders use natural language processing. Just
          describe when and what you want to be reminded about, like "Check the
          weather every morning at 8AM" or "Review quarterly goals on the 1st of
          each quarter".
        </p>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1">
          Notifications
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Manage your notification preferences
        </p>
      </div>

      {/* Notification Options */}
      <div className="space-y-3">
        {[
          {
            title: "Email Notifications",
            description: "Receive email updates about your account",
          },
          {
            title: "Push Notifications",
            description: "Receive push notifications in your browser",
          },
          {
            title: "Sound Effects",
            description: "Play sound when receiving messages",
          },
          {
            title: "Desktop Notifications",
            description: "Show desktop notifications for new messages",
          },
        ].map((option) => (
          <div
            key={option.title}
            className="flex items-center justify-between p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]"
          >
            <div>
              <h3 className="font-medium text-[var(--color-text-primary)]">
                {option.title}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {option.description}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1">
          Privacy & Security
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Manage your privacy and security settings
        </p>
      </div>

      {/* Privacy Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <div>
            <h3 className="font-medium text-[var(--color-text-primary)]">
              Save Chat History
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Allow Erudite to save your conversations
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <div>
            <h3 className="font-medium text-[var(--color-text-primary)]">
              Data Collection
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Allow analytics to improve your experience
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-t border-[var(--color-border)] pt-6 mt-8">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          Danger Zone
        </h3>
        <div className="space-y-3">
          <button className="w-full px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all font-medium text-left">
            Clear All Chat History
          </button>
          <button className="w-full px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all font-medium text-left">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1">
          About Erudite
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Information about this application
        </p>
      </div>

      {/* App Info */}
      <div className="p-6 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 overflow-hidden">
            <img
              src="/logo.jpg"
              alt="Erudite Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
              Erudite
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Version 1.0.0
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">
              Last Updated
            </span>
            <span className="text-[var(--color-text-primary)] font-medium">
              January 2026
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">License</span>
            <span className="text-[var(--color-text-primary)] font-medium">
              MIT
            </span>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="space-y-2">
        <a
          href="#"
          className="block p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-[var(--color-text-primary)] group-hover:text-emerald-400 transition-colors">
              Terms of Service
            </span>
            <ChevronRight
              size={20}
              className="text-[var(--color-text-secondary)]"
            />
          </div>
        </a>

        <a
          href="#"
          className="block p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-[var(--color-text-primary)] group-hover:text-emerald-400 transition-colors">
              Privacy Policy
            </span>
            <ChevronRight
              size={20}
              className="text-[var(--color-text-secondary)]"
            />
          </div>
        </a>

        <a
          href="#"
          className="block p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-[var(--color-text-primary)] group-hover:text-emerald-400 transition-colors">
              Help & Support
            </span>
            <ChevronRight
              size={20}
              className="text-[var(--color-text-secondary)]"
            />
          </div>
        </a>
      </div>
    </div>
  );
}
