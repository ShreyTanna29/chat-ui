import {
  Copy,
  Check,
  User,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Share2,
  Reply,
  Volume2,
  VolumeX,
  Loader2,
  FileText,
  Download,
  X,
  Image as ImageIcon,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/atom-one-dark.css";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { speakText, TTSController } from "@/services/tts";

// Language alias map to normalize language names for syntax highlighting
// Maps common aliases and misspellings to the actual language names supported by Prism
const languageAliases: Record<string, string> = {
  // JavaScript variants
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  node: "javascript",
  nodejs: "javascript",

  // Python
  py: "python",
  python3: "python",
  py3: "python",

  // Shell/Bash
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  terminal: "bash",
  console: "bash",

  // Markup/Web
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  xhtml: "markup",
  rss: "markup",
  atom: "markup",
  mathml: "markup",
  ssml: "markup",

  // Styles
  sass: "scss",
  styl: "stylus",

  // Data formats
  yml: "yaml",

  // C variants
  c: "c",
  "c++": "cpp",
  cc: "cpp",
  cxx: "cpp",
  "h++": "cpp",
  hh: "cpp",
  hpp: "cpp",
  hxx: "cpp",

  // C#
  "c#": "csharp",
  cs: "csharp",
  dotnet: "csharp",

  // Other languages
  rb: "ruby",
  rs: "rust",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  objc: "objectivec",
  "objective-c": "objectivec",
  pl: "perl",
  pm: "perl",
  lua: "lua",
  r: "r",
  scala: "scala",
  groovy: "groovy",
  gradle: "groovy",
  clj: "clojure",
  cljs: "clojure",
  erl: "erlang",
  hrl: "erlang",
  ex: "elixir",
  exs: "elixir",
  hs: "haskell",
  lhs: "haskell",
  ml: "ocaml",
  mli: "ocaml",
  fs: "fsharp",
  fsi: "fsharp",
  fsx: "fsharp",
  "f#": "fsharp",
  ps1: "powershell",
  psm1: "powershell",
  psd1: "powershell",
  ps: "powershell",

  // Configs
  dockerfile: "docker",
  tf: "hcl",
  hcl: "hcl",
  toml: "toml",
  ini: "ini",
  conf: "nginx",
  nginx: "nginx",
  apache: "apacheconf",
  htaccess: "apacheconf",

  // Databases
  psql: "sql",
  mysql: "sql",
  postgres: "sql",
  sqlite: "sql",
  plsql: "sql",

  // Misc
  md: "markdown",
  mdx: "markdown",
  tex: "latex",
  latex: "latex",
  asm: "nasm",
  assembly: "nasm",
  vim: "vim",
  viml: "vim",
  makefile: "makefile",
  make: "makefile",
  cmake: "cmake",
  diff: "diff",
  patch: "diff",
  git: "git",
  graphql: "graphql",
  gql: "graphql",
  proto: "protobuf",
  protobuf: "protobuf",
  regex: "regex",
  regexp: "regex",
  solidity: "solidity",
  sol: "solidity",
  wasm: "wasm",
  webassembly: "wasm",

  // Plain text fallbacks
  text: "text",
  txt: "text",
  plain: "text",
  log: "text",
  output: "text",
  plaintext: "text",
  "": "text",
};

// Function to normalize language name
function normalizeLanguage(lang: string | undefined): string {
  if (!lang) return "text";

  const normalized = lang.toLowerCase().trim();

  // Check if it's in our alias map
  if (languageAliases[normalized]) {
    return languageAliases[normalized];
  }

  // Return as-is if not in aliases (Prism might still support it directly)
  return normalized;
}

// Type for citation from web search
interface Citation {
  type: string;
  url: string;
  title: string;
  start_index: number;
  end_index: number;
}

// Type for message metadata from Cloudinary
interface MessageMetadata {
  hasImage?: boolean;
  imageType?: string;
  imageUrl?: string;
  imagePublicId?: string;
  hasDocument?: boolean;
  documentName?: string;
  documentType?: string;
  documentSize?: number;
  documentUrl?: string;
  documentPublicId?: string;
  generatedImages?: Array<{
    url: string;
    revised_prompt?: string;
  }>;
  citations?: Citation[];
  [key: string]: unknown;
}

// Code block component with copy button and syntax highlighting
// Code block component with copy button and syntax highlighting
function CodeBlock({
  children,
  language,
}: {
  children?: React.ReactNode;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const codeString = String(children).replace(/\n$/, "");

  // Normalize the language name for better syntax highlighting compatibility
  // If language is missing, we pass undefined to allow auto-detection
  const normalizedLang = language ? normalizeLanguage(language) : undefined;
  // Display the original language name (if provided) for the header, but fallback to normalized or "code"
  const displayLang =
    language || (normalizedLang !== "text" ? normalizedLang : "code");

  useEffect(() => {
    if (codeRef.current) {
      // Dynamic import of highlight.js for code splitting
      import("highlight.js").then((hljs) => {
        if (codeRef.current) {
          // Clear any previous highlighting attributes
          codeRef.current.removeAttribute("data-highlighted");
          // Apply highlighting
          hljs.default.highlightElement(codeRef.current);
        }
      });
    }
  }, [codeString, normalizedLang]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate line numbers
  const lines = codeString.split("\n");
  const showLineNumbers = lines.length > 3;

  return (
    <div className="relative my-4 rounded-xl overflow-hidden bg-[#282c34] border border-[var(--color-border)]">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#21252b] border-b border-[var(--color-border)]">
        <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          {displayLang || "code"}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
            "border border-transparent",
            copied
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]",
          )}
          title="Copy code"
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
      </div>
      {/* Code content with syntax highlighting */}
      <div className="overflow-x-auto p-4">
        <div className="flex">
          {showLineNumbers && (
            <div
              className="flex flex-col pr-4 select-none text-right"
              style={{ minWidth: "2.5em" }}
            >
              {lines.map((_, i) => (
                <span
                  key={i}
                  className="text-[#636d83] text-sm leading-relaxed font-mono"
                >
                  {i + 1}
                </span>
              ))}
            </div>
          )}
          <pre className="flex-1 m-0 bg-transparent overflow-visible">
            <code
              ref={codeRef}
              className={cn(
                "hljs font-mono text-sm leading-relaxed bg-transparent",
                normalizedLang && `language-${normalizedLang}`,
              )}
              style={{ background: "transparent" }}
            >
              {codeString}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}

// Sources component for displaying citations from web search
function SourcesPanel({ citations }: { citations: Citation[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Deduplicate citations by URL
  const uniqueCitations = citations.reduce((acc, citation) => {
    if (!acc.some((c) => c.url === citation.url)) {
      acc.push(citation);
    }
    return acc;
  }, [] as Citation[]);

  if (uniqueCitations.length === 0) return null;

  // Extract domain/favicon from URL
  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const displayedCitations = isExpanded
    ? uniqueCitations
    : uniqueCitations.slice(0, 3);
  const hasMore = uniqueCitations.length > 3;

  return (
    <div className="mt-4 mb-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Globe size={14} className="text-blue-400" />
          <span className="text-xs font-medium text-blue-400">Sources</span>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">
          {uniqueCitations.length}{" "}
          {uniqueCitations.length === 1 ? "source" : "sources"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {displayedCitations.map((citation, idx) => {
          const faviconUrl = getFaviconUrl(citation.url);
          const domain = getDomain(citation.url);

          return (
            <a
              key={idx}
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group flex items-center gap-2.5 px-3 py-2 rounded-xl",
                "bg-[var(--color-surface)] border border-[var(--color-border)]",
                "hover:border-blue-500/40 hover:bg-[var(--color-surface-hover)]",
                "transition-all duration-200 max-w-[280px]",
              )}
            >
              <div className="flex-shrink-0 w-5 h-5 rounded-md bg-white/10 flex items-center justify-center overflow-hidden">
                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt=""
                    className="w-4 h-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (
                        e.target as HTMLImageElement
                      ).nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <Globe
                  size={12}
                  className={cn(
                    "text-[var(--color-text-muted)]",
                    faviconUrl && "hidden",
                  )}
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <span className="text-xs font-medium text-[var(--color-text-primary)] truncate leading-tight">
                  {citation.title || domain}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] truncate">
                  {domain}
                </span>
              </div>
              <ExternalLink
                size={12}
                className="flex-shrink-0 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </a>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg text-xs font-medium",
            "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            "hover:bg-[var(--color-surface)] transition-all",
          )}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} />
              Show less
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              Show {uniqueCitations.length - 3} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  metadata?: MessageMetadata;
  loadingMessage?: string;
  streamingImage?: string | null;
  onAskErudite?: (text: string) => void;
  onShare?: () => void;
  onRegenerate?: () => void;
}

// Heuristic function to check if text looks like code
function isCodeLike(text: string): boolean {
  if (!text || text.length < 20) return false;

  const lines = text.split("\n");
  const trimmedText = text.trim();

  // Strong code indicators that are rarely found in prose
  const strongIndicators = {
    // Code-specific operators and syntax
    hasArrowFunction: /=>/.test(text),
    hasPointerOp: /->/.test(text),
    hasDoubleColon: /::/.test(text),
    hasTemplateString: /`.*\$\{.*\}`/.test(text),
    hasRegexLiteral: /\/[^/\s]+\/[gimuy]*/.test(text),

    // Paired syntax (must have both opening and closing)
    hasMatchedBraces: (() => {
      const openBraces = (text.match(/\{/g) || []).length;
      const closeBraces = (text.match(/\}/g) || []).length;
      return openBraces > 0 && openBraces === closeBraces;
    })(),

    hasMatchedBrackets: (() => {
      const openBrackets = (text.match(/\[/g) || []).length;
      const closeBrackets = (text.match(/\]/g) || []).length;
      return openBrackets > 1 && openBrackets === closeBrackets;
    })(),

    // Code comments
    hasLineComments: /\/\//.test(text) || /#(?!\s*\d)/.test(text),
    hasBlockComments: /\/\*[\s\S]*?\*\//.test(text),

    // Semicolons at end of lines (not mid-sentence)
    hasLineSemicolons: /;(\s*$|\s*\/\/)/m.test(text),

    // Assignment operators
    hasAssignment: /\s[+\-*/%&|^]?=(?!=)\s/.test(text),
  };

  // Check for common programming patterns
  const patterns = {
    functionDeclaration: /\b(function|def|fn|func|fun)\s+\w+\s*\(/,
    variableDeclaration:
      /\b(const|let|var|int|string|bool|float|double|char)\s+\w+/,
    importStatement: /\b(import|from|require|include|using)\s+/,
    classDeclaration: /\b(class|interface|struct|enum|trait)\s+\w+/,
    controlFlow: /\b(if|else|for|while|switch|foreach)\s*\(/,
    returnStatement: /\breturn\s+[^;]*;/,
  };

  // Count pattern matches
  let patternMatches = 0;
  for (const pattern of Object.values(patterns)) {
    if (pattern.test(text)) patternMatches++;
  }

  // Count strong indicators
  const strongIndicatorCount = Object.values(strongIndicators).filter(
    (val) => val === true,
  ).length;

  // Check indentation consistency (code usually has consistent indentation)
  const indentedLines = lines.filter(
    (l) => l.length > 0 && (l.startsWith("  ") || l.startsWith("\t")),
  ).length;
  const hasConsistentIndentation =
    lines.length > 3 && indentedLines / lines.length > 0.4;

  // Check for prose indicators (signs this is NOT code)
  const proseIndicators = {
    // Sentences ending with periods
    hasSentenceEndings: /[.!?]\s+[A-Z]/.test(text),
    // Common prose conjunctions and articles
    hasProseWords:
      /\b(the|a|an|is|are|was|were|been|has|have|had|will|would|should|could|this|that|these|those)\b/gi.test(
        text,
      ) &&
      (
        text.match(
          /\b(the|a|an|is|are|was|were|been|has|have|had|will|would|should|could|this|that|these|those)\b/gi,
        ) || []
      ).length > 3,
    // Starts with capital and ends with period (typical sentence)
    startsWithCapital: /^[A-Z]/.test(trimmedText),
    endsWithPeriod: /[.!?]$/.test(trimmedText),
    // Multiple complete sentences
    hasMultipleSentences: (text.match(/[.!?]\s+/g) || []).length > 1,
  };

  const proseScore =
    (proseIndicators.hasSentenceEndings ? 2 : 0) +
    (proseIndicators.hasProseWords ? 2 : 0) +
    (proseIndicators.startsWithCapital &&
    proseIndicators.endsWithPeriod &&
    !strongIndicators.hasLineSemicolons
      ? 1
      : 0) +
    (proseIndicators.hasMultipleSentences && patternMatches === 0 ? 2 : 0);

  // Scoring system
  let codeScore = 0;

  // Strong indicators are worth more
  codeScore += strongIndicatorCount * 3;

  // Pattern matches
  codeScore += patternMatches * 4;

  // Consistent indentation
  if (hasConsistentIndentation) codeScore += 3;

  // Subtract prose score
  codeScore -= proseScore;

  // Require a higher threshold and that code indicators outweigh prose indicators
  return codeScore >= 8 && strongIndicatorCount + patternMatches > 0;
}

export function ChatMessage({
  role,
  content,
  isLoading,
  loadingMessage,
  streamingImage,
  metadata,
  onAskErudite,
  onShare,
  onRegenerate,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [selection, setSelection] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);
  const [selectionCopied, setSelectionCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [imageZoom, setImageZoom] = useState<string | null>(null);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  const ttsControllerRef = useRef<TTSController | null>(null);

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

  const handleSpeak = () => {
    // If already speaking or loading, stop
    if (isSpeaking || isLoadingTTS) {
      if (ttsControllerRef.current) {
        ttsControllerRef.current.stop();
        ttsControllerRef.current = null;
      }
      setIsSpeaking(false);
      setIsLoadingTTS(false);
      return;
    }

    setIsLoadingTTS(true);

    // speakText now returns controller synchronously (playback runs in background)
    const controller = speakText(
      content,
      { voice: "nova" },
      {
        onStart: () => {
          setIsLoadingTTS(false);
          setIsSpeaking(true);
        },
        onEnd: () => {
          setIsSpeaking(false);
          ttsControllerRef.current = null;
        },
        onError: (error) => {
          console.error("TTS error:", error);
          setIsSpeaking(false);
          setIsLoadingTTS(false);
          ttsControllerRef.current = null;
        },
      },
    );
    ttsControllerRef.current = controller;
  };

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => {
      if (ttsControllerRef.current) {
        ttsControllerRef.current.stop();
      }
    };
  }, []);

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
      setSelectionCopied(false);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleCopySelection = async () => {
    if (selection) {
      await navigator.clipboard.writeText(selection.text);
      setSelectionCopied(true);
      setTimeout(() => {
        setSelectionCopied(false);
        setSelection(null);
        window.getSelection()?.removeAllRanges();
      }, 1500);
    }
  };

  const isUser = role === "user";

  return (
    <div
      className={cn(
        "w-full py-8 animate-slide-up relative",
        isUser
          ? "bg-transparent"
          : "bg-gradient-to-b from-[var(--color-surface)]/30 to-transparent border-t border-[var(--color-border)]/50",
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
          <div className="flex items-center gap-2 px-2 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl">
            <button
              onClick={handleCopySelection}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                selectionCopied
                  ? "text-emerald-400 bg-emerald-500/10"
                  : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]",
              )}
            >
              {selectionCopied ? (
                <>
                  <Check size={16} className="text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy</span>
                </>
              )}
            </button>
            <div className="w-px h-6 bg-[var(--color-border)]" />
            <button
              onClick={handleAskErudite}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              <Reply size={16} className="text-emerald-400" />
              <span>Ask Erudite</span>
            </button>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-[var(--color-surface)] border-b border-r border-[var(--color-border)] rotate-45" />
        </div>
      )}

      <div
        className={cn(
          "max-w-5xl mx-auto px-4 sm:px-6 flex gap-4",
          isUser && "flex-row-reverse",
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg",
            isUser
              ? "bg-gradient-to-br from-gray-700 to-gray-800 border border-[var(--color-border)] group-hover:shadow-gray-500/20"
              : "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30 animate-float",
          )}
        >
          {isUser ? (
            <User size={18} className="text-gray-300" />
          ) : (
            <>
              <img
                src="/logo.jpg"
                alt="Erudite Logo"
                className="w-full h-full object-cover rounded-2xl"
              />
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 group">
          <div
            className={cn(
              "flex items-center gap-2 mb-2.5",
              isUser && "justify-end",
            )}
          >
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
                {loadingMessage || "Thinking..."}
              </span>
            </div>
          ) : (
            <>
              {/* Streaming Image Display */}
              {streamingImage && (
                <div className="mb-4 relative group/genimg">
                  <button
                    onClick={() => setImageZoom(streamingImage)}
                    className="relative block rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-emerald-500/40 transition-all shadow-lg hover:shadow-emerald-500/20"
                  >
                    <img
                      src={streamingImage}
                      alt="Generating..."
                      className="max-w-[280px] max-h-[280px] object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/genimg:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/genimg:opacity-100">
                      <ImageIcon
                        size={24}
                        className="text-white drop-shadow-md"
                      />
                    </div>
                  </button>
                </div>
              )}

              <div
                ref={contentRef}
                onMouseUp={handleMouseUp}
                className={cn(
                  "text-[var(--color-text-primary)] leading-[1.75]",
                  "text-[15px]",
                  "prose prose-invert max-w-none",
                  "prose-p:leading-[1.75] prose-p:mb-4 last:prose-p:mb-0",
                  "prose-headings:text-[var(--color-text-primary)] prose-headings:font-semibold prose-headings:mb-4 prose-headings:mt-6 first:prose-headings:mt-0",
                  "prose-strong:text-[var(--color-text-primary)] prose-strong:font-semibold",
                  "prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline",
                  "prose-code:before:content-none prose-code:after:content-none",
                  "prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 prose-pre:border-0",
                  "[&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:!bg-transparent",
                  "[&_.syntax-highlighter]:!bg-transparent",
                  "prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6",
                  "prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6",
                  "prose-li:my-1",
                  "prose-blockquote:border-l-4 prose-blockquote:border-emerald-500/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-[var(--color-text-secondary)]",
                  "prose-hr:border-[var(--color-border)] prose-hr:my-6",
                  "prose-table:w-full prose-table:my-6 prose-table:border-collapse",
                  "prose-th:text-left prose-th:p-2 prose-th:border-b prose-th:border-[var(--color-border)] prose-th:text-[var(--color-text-primary)]",
                  "prose-td:p-2 prose-td:border-b prose-td:border-[var(--color-border)] prose-td:text-[var(--color-text-secondary)]",
                  isUser && "text-right prose-p:text-right",
                )}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: (props) => (
                      <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                    p: ({ children }) => {
                      // Check if the paragraph content looks like code
                      const content = String(children);
                      if (isCodeLike(content)) {
                        return <CodeBlock>{children}</CodeBlock>;
                      }
                      return <p>{children}</p>;
                    },
                    pre: ({ children }) => {
                      // Just return children - our code component will handle rendering
                      return <>{children}</>;
                    },
                    code: ({ node, className, children, ...props }) => {
                      // Check if this is a code block by looking at parent node
                      // In markdown, code blocks are wrapped in <pre><code>, while inline code is just <code>
                      const isInline =
                        !node?.position ||
                        (node.position.start.line === node.position.end.line &&
                          !String(children).includes("\n"));

                      // Also check for language class (indicates a fenced code block)
                      const hasLanguageClass =
                        className?.startsWith("language-");

                      // Get content and check if it has newlines
                      const content = String(children).replace(/\n$/, "");
                      const hasNewlines = content.includes("\n");

                      // Treat as code block if: has language class, has newlines, or is multiline position
                      const isCodeBlock =
                        hasLanguageClass || hasNewlines || !isInline;

                      if (isCodeBlock) {
                        const language =
                          className?.replace("language-", "") || "";
                        return (
                          <CodeBlock language={language}>{children}</CodeBlock>
                        );
                      }
                      // Inline code
                      return (
                        <code
                          className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface)] text-[var(--color-text-primary)] font-mono text-[0.9em]"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>

              {/* Attachments display - User uploaded images and documents */}
              {metadata && (metadata.hasImage || metadata.hasDocument) && (
                <div
                  className={cn(
                    "mt-4 flex flex-wrap gap-3",
                    isUser && "justify-end",
                  )}
                >
                  {/* Image attachment */}
                  {metadata.hasImage && metadata.imageUrl && (
                    <div className="relative group/image">
                      <button
                        onClick={() => setImageZoom(metadata.imageUrl || null)}
                        className="relative block rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-emerald-500/40 transition-all shadow-lg hover:shadow-emerald-500/20"
                      >
                        <img
                          src={metadata.imageUrl}
                          alt="Uploaded image"
                          className="max-w-[200px] max-h-[200px] object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/image:opacity-100">
                          <ImageIcon
                            size={24}
                            className="text-white drop-shadow-md"
                          />
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Document attachment */}
                  {metadata.hasDocument && metadata.documentUrl && (
                    <a
                      href={metadata.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={metadata.documentName}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl",
                        "bg-[var(--color-surface)] border border-[var(--color-border)]",
                        "hover:border-emerald-500/40 hover:bg-[var(--color-surface-hover)]",
                        "transition-all shadow-lg hover:shadow-emerald-500/20",
                      )}
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <FileText size={20} className="text-emerald-400" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium text-[var(--color-text-primary)] max-w-[150px] truncate">
                          {metadata.documentName || "Document"}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {metadata.documentSize
                            ? `${(metadata.documentSize / 1024).toFixed(1)} KB`
                            : metadata.documentType || "File"}
                        </span>
                      </div>
                      <Download
                        size={16}
                        className="text-[var(--color-text-muted)] ml-2"
                      />
                    </a>
                  )}
                </div>
              )}

              {/* AI Generated images */}
              {!isUser &&
                metadata?.generatedImages &&
                metadata.generatedImages.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {metadata.generatedImages.map((img, idx) => (
                      <div key={idx} className="relative group/genimg">
                        <button
                          onClick={() => setImageZoom(img.url)}
                          className="relative block rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-emerald-500/40 transition-all shadow-lg hover:shadow-emerald-500/20"
                        >
                          <img
                            src={img.url}
                            alt={
                              img.revised_prompt || `Generated image ${idx + 1}`
                            }
                            className="max-w-[280px] max-h-[280px] object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/genimg:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/genimg:opacity-100">
                            <ImageIcon
                              size={24}
                              className="text-white drop-shadow-md"
                            />
                          </div>
                        </button>
                        {img.revised_prompt && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-2 max-w-[280px] line-clamp-2">
                            {img.revised_prompt}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              {/* Sources from web search */}
              {!isUser &&
                metadata?.citations &&
                metadata.citations.length > 0 && (
                  <SourcesPanel citations={metadata.citations} />
                )}

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
                        : "text-[var(--color-text-secondary)]",
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

                  <button
                    onClick={handleSpeak}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                      "border border-[var(--color-border)] hover:border-[var(--color-border-hover)]",
                      "hover:bg-[var(--color-surface)] active:scale-95",
                      isSpeaking
                        ? "text-red-400 bg-red-500/10 border-red-500/30"
                        : isLoadingTTS
                          ? "text-blue-400 bg-blue-500/10 border-blue-500/30"
                          : "text-[var(--color-text-secondary)]",
                    )}
                    title={
                      isSpeaking
                        ? "Stop"
                        : isLoadingTTS
                          ? "Loading..."
                          : "Speak"
                    }
                  >
                    {isLoadingTTS ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : isSpeaking ? (
                      <>
                        <VolumeX size={14} />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 size={14} />
                        <span>Speak</span>
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
                        : "text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-secondary)]",
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
                        : "text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-secondary)]",
                    )}
                    title="Bad response"
                  >
                    <ThumbsDown size={14} />
                  </button>

                  <button
                    onClick={onRegenerate}
                    className={cn(
                      "p-2 rounded-xl transition-all border border-[var(--color-border)]",
                      "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                      "hover:bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]",
                      "active:scale-95",
                    )}
                    title="Regenerate"
                  >
                    <RotateCcw size={14} />
                  </button>

                  <button
                    onClick={onShare}
                    className={cn(
                      "p-2 rounded-xl transition-all border border-[var(--color-border)]",
                      "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                      "hover:bg-[var(--color-surface)] hover:border-[var(--color-border-hover)]",
                      "active:scale-95",
                    )}
                    title="Share"
                  >
                    <Share2 size={14} />
                  </button>

                  <div className="w-px h-5 bg-[var(--color-border)]" />

                  <button
                    onClick={() => onAskErudite?.(content)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                      "border border-[var(--color-border)] hover:border-emerald-500/30",
                      "text-[var(--color-text-secondary)] hover:text-emerald-400",
                      "hover:bg-emerald-500/10 active:scale-95",
                    )}
                    title="Reply to this message"
                  >
                    <Reply size={14} />
                    <span>Reply</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Image zoom modal */}
      {imageZoom && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 animate-in fade-in duration-200"
          onClick={() => setImageZoom(null)}
        >
          <button
            onClick={() => setImageZoom(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X size={24} />
          </button>
          <img
            src={imageZoom}
            alt="Zoomed image"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
