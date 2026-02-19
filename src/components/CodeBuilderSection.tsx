import { useState, useRef, useEffect, useCallback } from "react";
import sdk from "@stackblitz/sdk";
import type { VM } from "@stackblitz/sdk";
import {
  Code2,
  Play,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileCode,
  Sparkles,
  X,
  Send,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type CodeFile,
  streamGenerateCode,
  streamRefineCode,
} from "@/services/codebuilder";

// Default React template shown before any project is generated
const DEFAULT_TEMPLATE_FILES: Record<string, string> = {
  "src/App.jsx": `export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '4rem 2rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981' }}>
        Code Builder
      </h1>
      <p style={{ color: '#6b7280', marginTop: '0.75rem', maxWidth: 400, margin: '0.75rem auto 0' }}>
        Describe what you want to build in the prompt on the left, then hit
        <strong style={{ color: '#10b981' }}> Generate</strong> to create your app.
      </p>
    </div>
  );
}
`,
  "src/main.jsx": `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`,
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Code Builder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
  "package.json": JSON.stringify(
    {
      name: "code-builder-app",
      version: "0.0.0",
      private: true,
      scripts: { dev: "vite", build: "vite build" },
      dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.4",
        vite: "^5.4.10",
      },
    },
    null,
    2,
  ),
  "vite.config.js": `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });
`,
};

function filesToRecord(files: CodeFile[]): Record<string, string> {
  const record: Record<string, string> = { ...DEFAULT_TEMPLATE_FILES };
  for (const f of files) {
    record[f.path] = f.content;
  }
  return record;
}

interface CodeBuilderSectionProps {
  onBack?: () => void;
}

export function CodeBuilderSection({ onBack }: CodeBuilderSectionProps) {
  const [prompt, setPrompt] = useState("");
  const [projectName, setProjectName] = useState("my-app");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamLog, setStreamLog] = useState("");
  const [generatedFiles, setGeneratedFiles] = useState<CodeFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  // Refine mode
  const [refineFeedback, setRefineFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  const embedContainerRef = useRef<HTMLDivElement>(null);
  const vmRef = useRef<VM | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const hasProject = generatedFiles.length > 0;

  // Mount StackBlitz with default template on first render
  useEffect(() => {
    if (!embedContainerRef.current) return;

    let isMounted = true;
    sdk
      .embedProject(
        embedContainerRef.current,
        {
          title: "Code Builder",
          template: "node",
          files: DEFAULT_TEMPLATE_FILES,
        },
        {
          height: "100%",
          hideNavigation: false,
          forceEmbedLayout: true,
          openFile: "src/App.jsx",
          view: "preview",
          theme: "dark",
        },
      )
      .then((vm) => {
        if (isMounted) vmRef.current = vm;
      })
      .catch((err) => {
        console.error("StackBlitz embed error:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamLog]);

  const updateEmbedFiles = useCallback(
    async (files: CodeFile[], title: string) => {
      if (!vmRef.current) return;
      try {
        const fileMap = filesToRecord(files);
        await vmRef.current.applyFsDiff({
          create: fileMap,
          destroy: [],
        });
      } catch {
        // VM may not support applyFsDiff; remount instead
        if (!embedContainerRef.current) return;
        vmRef.current = await sdk.embedProject(
          embedContainerRef.current,
          {
            title,
            template: "node",
            files: filesToRecord(files),
          },
          {
            height: "100%",
            hideNavigation: false,
            forceEmbedLayout: true,
            openFile: files[0]?.path || "src/App.jsx",
            view: "preview",
            theme: "dark",
          },
        );
      }
    },
    [],
  );

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;
    setError(null);
    setStreamLog("");
    setIsGenerating(true);
    setShowLog(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let accLog = "";
      let finalFiles: CodeFile[] = [];

      for await (const event of streamGenerateCode(
        prompt.trim(),
        projectName.trim() || "react-app",
        abort.signal,
      )) {
        if (event.type === "chunk") {
          accLog += event.content;
          setStreamLog(accLog);
        } else if (event.type === "complete") {
          finalFiles = event.files;
          setGeneratedFiles(finalFiles);
          await updateEmbedFiles(
            finalFiles,
            projectName.trim() || "Code Builder",
          );
        } else if (event.type === "error") {
          setError(event.message);
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Generation failed");
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [prompt, projectName, isGenerating, updateEmbedFiles]);

  const handleRefine = useCallback(async () => {
    if (!refineFeedback.trim() || isRefining || generatedFiles.length === 0)
      return;
    setError(null);
    setStreamLog("");
    setIsRefining(true);
    setShowLog(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let accLog = "";
      const current = generatedFiles.map(({ path, content }) => ({
        path,
        content,
      }));

      for await (const event of streamRefineCode(
        current,
        refineFeedback.trim(),
        abort.signal,
      )) {
        if (event.type === "chunk") {
          accLog += event.content;
          setStreamLog(accLog);
        } else if (event.type === "complete") {
          // Merge – server only returns modified files
          const updatedMap = new Map(event.files.map((f) => [f.path, f]));
          const merged = generatedFiles.map((f) =>
            updatedMap.has(f.path) ? updatedMap.get(f.path)! : f,
          );
          // Add any brand-new files the server returned
          for (const f of event.files) {
            if (!merged.find((m) => m.path === f.path)) merged.push(f);
          }
          setGeneratedFiles(merged);
          await updateEmbedFiles(merged, projectName.trim() || "Code Builder");
          setRefineFeedback("");
        } else if (event.type === "error") {
          setError(event.message);
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Refine failed");
      }
    } finally {
      setIsRefining(false);
      abortRef.current = null;
    }
  }, [
    refineFeedback,
    isRefining,
    generatedFiles,
    projectName,
    updateEmbedFiles,
  ]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleNewProject = () => {
    setGeneratedFiles([]);
    setStreamLog("");
    setError(null);
    setPrompt("");
    setRefineFeedback("");
    setProjectName("my-app");
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        )}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Code2 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-[var(--color-text-primary)]">
            Code Builder
          </h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            AI-powered React app generator
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {hasProject && (
            <button
              onClick={handleNewProject}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                "border border-[var(--color-border)] hover:border-[var(--color-border-hover)]",
                "bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-active)]",
                "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              )}
            >
              <RefreshCw size={14} />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)]">
          {!hasProject ? (
            /* Generate panel */
            <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="my-awesome-app"
                  maxLength={100}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl text-sm",
                    "bg-[var(--color-surface)] border border-[var(--color-border)]",
                    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                    "focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20",
                    "transition-all duration-200",
                  )}
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to build…&#10;&#10;e.g. Create a todo app with add, delete, and mark-as-complete features, styled with Tailwind CSS."
                  maxLength={5000}
                  rows={10}
                  className={cn(
                    "flex-1 w-full px-3 py-2.5 rounded-xl text-sm resize-none",
                    "bg-[var(--color-surface)] border border-[var(--color-border)]",
                    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                    "focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20",
                    "transition-all duration-200",
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleGenerate();
                    }
                  }}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {prompt.length}/5000 · ⌘↵ to generate
                  </span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={isGenerating ? handleStop : handleGenerate}
                disabled={!prompt.trim() && !isGenerating}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                  "shadow-sm hover:shadow-md active:scale-[0.98]",
                  isGenerating
                    ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                    : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white hover:from-violet-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-violet-500 disabled:hover:to-indigo-600",
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Stop Generation
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate App
                  </>
                )}
              </button>

              {/* Stream log */}
              {streamLog && (
                <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                  <button
                    onClick={() => setShowLog((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[var(--color-surface)] text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Play size={12} />
                      Generation log
                    </span>
                    {showLog ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                  {showLog && (
                    <div className="max-h-48 overflow-y-auto bg-[var(--color-bg)] px-3 py-2">
                      <pre className="text-[10px] text-[var(--color-text-muted)] font-mono whitespace-pre-wrap break-all leading-relaxed">
                        {streamLog}
                      </pre>
                      <div ref={logEndRef} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Refine panel (project exists) */
            <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto">
              {/* File tree */}
              <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                <button
                  onClick={() => setShowFiles((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[var(--color-surface)] text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <FileCode size={12} />
                    {generatedFiles.length} file
                    {generatedFiles.length !== 1 ? "s" : ""} generated
                  </span>
                  {showFiles ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
                {showFiles && (
                  <div className="bg-[var(--color-bg)] px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
                    {generatedFiles.map((f) => (
                      <div
                        key={f.path}
                        className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                      >
                        <FileCode
                          size={11}
                          className="flex-shrink-0 text-violet-400"
                        />
                        <span className="font-mono truncate">{f.path}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Refine feedback */}
              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                  Refine / Improve
                </label>
                <textarea
                  value={refineFeedback}
                  onChange={(e) => setRefineFeedback(e.target.value)}
                  placeholder="Describe changes you want…&#10;&#10;e.g. Add dark mode, improve the button styles, and add a search filter."
                  maxLength={2000}
                  rows={8}
                  className={cn(
                    "flex-1 w-full px-3 py-2.5 rounded-xl text-sm resize-none",
                    "bg-[var(--color-surface)] border border-[var(--color-border)]",
                    "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                    "focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20",
                    "transition-all duration-200",
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleRefine();
                    }
                  }}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {refineFeedback.length}/2000 · ⌘↵ to apply
                  </span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={isRefining ? handleStop : handleRefine}
                  disabled={!refineFeedback.trim() && !isRefining}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    "shadow-sm hover:shadow-md active:scale-[0.98]",
                    isRefining
                      ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                      : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white hover:from-violet-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                >
                  {isRefining ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Wrench size={15} />
                      Refine
                    </>
                  )}
                </button>
                <button
                  onClick={handleNewProject}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    "border border-[var(--color-border)] hover:border-[var(--color-border-hover)]",
                    "bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]",
                    "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                  )}
                  title="New project"
                >
                  <Play size={15} />
                </button>
              </div>

              {/* Stream log */}
              {streamLog && (
                <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                  <button
                    onClick={() => setShowLog((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[var(--color-surface)] text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Send size={12} />
                      Refinement log
                    </span>
                    {showLog ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                  {showLog && (
                    <div className="max-h-48 overflow-y-auto bg-[var(--color-bg)] px-3 py-2">
                      <pre className="text-[10px] text-[var(--color-text-muted)] font-mono whitespace-pre-wrap break-all leading-relaxed">
                        {streamLog}
                      </pre>
                      <div ref={logEndRef} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel – StackBlitz embed */}
        <div className="flex-1 relative min-w-0 bg-[#1a1a2e]">
          {/* Loading overlay while generating */}
          {(isGenerating || isRefining) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#1a1a2e]/80 backdrop-blur-sm gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center">
                <Loader2 size={28} className="text-violet-400 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-violet-300">
                  {isGenerating ? "Generating your app…" : "Applying changes…"}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Streaming code from AI
                </p>
              </div>
            </div>
          )}

          {/* StackBlitz container */}
          <div ref={embedContainerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
