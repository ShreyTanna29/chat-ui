import { useState, useEffect } from "react";
import {
  Compass,
  Newspaper,
  Settings2,
  X,
  RefreshCw,
  ExternalLink,
  Clock,
  Tag,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDefaultNews,
  getCustomNews,
  updatePreferences,
  NewsArticle,
  AVAILABLE_CATEGORIES,
  AVAILABLE_COUNTRIES,
} from "@/services/discover";

type TabType = "general" | "custom";

export function DiscoverSection() {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(
    null,
  );

  // Preferences state
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const fetchNews = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result =
        activeTab === "general"
          ? await getDefaultNews()
          : await getCustomNews();

      if (result.success && result.data) {
        setNews(result.data);
      } else if (result.isLoading) {
        setError("News is being refreshed. Please try again in a moment.");
      } else {
        setError(result.message || "Failed to fetch news");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [activeTab]);

  const handleSavePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      const result = await updatePreferences(
        selectedCountries,
        selectedCategories,
      );
      if (result.success) {
        setShowPreferences(false);
        // Refresh custom news with new preferences
        if (activeTab === "custom") {
          fetchNews();
        }
      }
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const toggleCountry = (country: string) => {
    setSelectedCountries((prev) =>
      prev.includes(country)
        ? prev.filter((c) => c !== country)
        : [...prev, country],
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-background)]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Compass size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
                Discover
              </h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                Curated tech news for you
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "custom" && (
              <button
                onClick={() => setShowPreferences(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl transition-all",
                  "bg-[var(--color-surface)] border border-[var(--color-border)]",
                  "hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-hover)]",
                  "text-sm font-medium text-[var(--color-text-secondary)]",
                )}
              >
                <Settings2 size={16} />
                Preferences
              </button>
            )}
            <button
              onClick={fetchNews}
              disabled={isLoading}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                "bg-[var(--color-surface)] border border-[var(--color-border)]",
                "hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-hover)]",
                "text-[var(--color-text-secondary)]",
                isLoading && "animate-spin",
              )}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] w-fit">
          <button
            onClick={() => setActiveTab("general")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === "general"
                ? "bg-[var(--color-surface-active)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]",
            )}
          >
            <Newspaper size={16} />
            General News
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              activeTab === "custom"
                ? "bg-[var(--color-surface-active)] text-[var(--color-text-primary)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]",
            )}
          >
            <Settings2 size={16} />
            Customized News
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden animate-pulse"
              >
                <div className="h-48 bg-[var(--color-surface-hover)]" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-[var(--color-surface-hover)] rounded w-1/4" />
                  <div className="h-6 bg-[var(--color-surface-hover)] rounded w-3/4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-[var(--color-surface-hover)] rounded" />
                    <div className="h-3 bg-[var(--color-surface-hover)] rounded w-5/6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-[var(--color-surface)] flex items-center justify-center mb-5 border border-[var(--color-border)]">
              <Newspaper
                size={32}
                className="text-[var(--color-text-muted)] opacity-50"
              />
            </div>
            <p className="text-[var(--color-text-primary)] text-base font-semibold mb-2">
              {error}
            </p>
            <button
              onClick={fetchNews}
              className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium hover:shadow-lg transition-all"
            >
              Try Again
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-[var(--color-surface)] flex items-center justify-center mb-5 border border-[var(--color-border)]">
              <Newspaper
                size={32}
                className="text-[var(--color-text-muted)] opacity-50"
              />
            </div>
            <p className="text-[var(--color-text-primary)] text-base font-semibold mb-2">
              No news available
            </p>
            <p className="text-[var(--color-text-muted)] text-sm">
              Check back later for the latest tech news
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {news.map((article) => (
              <article
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className={cn(
                  "group rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden cursor-pointer",
                  "hover:border-[var(--color-border-hover)] hover:shadow-xl transition-all duration-300",
                  "transform hover:-translate-y-1",
                )}
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop";
                    }}
                  />
                  {/* Category badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold",
                        "bg-black/60 backdrop-blur-sm text-white",
                      )}
                    >
                      <Tag size={12} />
                      {article.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Source and date */}
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] mb-3">
                    <span className="font-medium text-[var(--color-text-secondary)]">
                      {article.source}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(article.publishedAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {article.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed">
                    {article.description}
                  </p>

                  {/* Read more indicator */}
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Read more</span>
                    <ExternalLink size={14} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPreferences(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg bg-[var(--color-background-elevated)] rounded-2xl border border-[var(--color-border)] shadow-2xl animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                News Preferences
              </h2>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-2 rounded-lg hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Countries */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                  Countries
                </h3>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_COUNTRIES.map((country) => (
                    <button
                      key={country}
                      onClick={() => toggleCountry(country)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        selectedCountries.includes(country)
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)]",
                      )}
                    >
                      {selectedCountries.includes(country) && (
                        <Check size={14} />
                      )}
                      {country}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                  Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        selectedCategories.includes(category)
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)]",
                      )}
                    >
                      {selectedCategories.includes(category) && (
                        <Check size={14} />
                      )}
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--color-border)]">
              <button
                onClick={() => setShowPreferences(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreferences}
                disabled={isSavingPreferences}
                className={cn(
                  "px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all",
                  "bg-gradient-to-r from-emerald-500 to-emerald-600",
                  "hover:shadow-lg hover:shadow-emerald-500/25",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {isSavingPreferences ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* News Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedArticle(null)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-[var(--color-background-elevated)] rounded-2xl border border-[var(--color-border)] shadow-2xl animate-scale-in overflow-hidden flex flex-col">
            {/* Image Header */}
            <div className="relative h-56 flex-shrink-0 overflow-hidden">
              <img
                src={selectedArticle.imageUrl}
                alt={selectedArticle.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop";
                }}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Close button */}
              <button
                onClick={() => setSelectedArticle(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              >
                <X size={20} />
              </button>

              {/* Category badge */}
              <div className="absolute bottom-4 left-4">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold",
                    "bg-black/60 backdrop-blur-sm text-white",
                  )}
                >
                  <Tag size={14} />
                  {selectedArticle.category}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Meta info */}
              <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mb-4">
                <span className="font-semibold text-[var(--color-text-secondary)]">
                  {selectedArticle.source}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {formatDate(selectedArticle.publishedAt)}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-5 leading-tight">
                {selectedArticle.title}
              </h2>

              {/* Description */}
              <div className="prose prose-invert max-w-none">
                <p className="text-base text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {selectedArticle.description}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
              <button
                onClick={() => setSelectedArticle(null)}
                className={cn(
                  "w-full py-3 rounded-xl text-sm font-semibold transition-all",
                  "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white",
                  "hover:shadow-lg hover:shadow-emerald-500/25",
                )}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
