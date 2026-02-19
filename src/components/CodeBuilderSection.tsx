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

// Well-known npm packages and their latest stable versions
const KNOWN_PACKAGE_VERSIONS: Record<string, string> = {
  "react-router-dom": "^6.26.0",
  "react-router": "^6.26.0",
  axios: "^1.7.7",
  "lucide-react": "^0.400.0",
  "framer-motion": "^11.5.0",
  zustand: "^5.0.0",
  "react-hook-form": "^7.53.0",
  zod: "^3.23.8",
  "date-fns": "^4.1.0",
  "react-query": "^3.39.3",
  "@tanstack/react-query": "^5.59.0",
  clsx: "^2.1.1",
  "class-variance-authority": "^0.7.0",
  "tailwind-merge": "^2.5.0",
  tailwindcss: "^3.4.13",
  "@emotion/react": "^11.13.3",
  "@emotion/styled": "^11.13.0",
  "@mui/material": "^6.1.1",
  "styled-components": "^6.1.13",
  uuid: "^10.0.0",
  "react-icons": "^5.3.0",
  "react-toastify": "^10.0.5",
  recharts: "^2.12.7",
  "chart.js": "^4.4.4",
  "react-chartjs-2": "^5.2.0",
  lodash: "^4.17.21",
  "lodash-es": "^4.17.21",
  immer: "^10.1.1",
  "react-dnd": "^16.0.1",
  "react-dnd-html5-backend": "^16.0.1",
};

/**
 * Scan generated source files for npm imports and return a package.json
 * that includes all detected third-party dependencies.
 */
function buildPackageJsonFromFiles(
  files: CodeFile[],
  projectName: string,
): string {
  // Find an AI-provided package.json first
  const aiPkgFile = files.find(
    (f) => f.path === "package.json" || f.path.endsWith("/package.json"),
  );
  if (aiPkgFile) {
    try {
      const parsed = JSON.parse(aiPkgFile.content);
      // Ensure devDeps have vite + react plugin
      parsed.devDependencies = {
        "@vitejs/plugin-react": "^4.3.4",
        vite: "^5.4.10",
        ...parsed.devDependencies,
      };
      parsed.scripts = { dev: "vite", build: "vite build", ...parsed.scripts };
      return JSON.stringify(parsed, null, 2);
    } catch {
      // fall through to auto-detect
    }
  }

  // Auto-detect imports from source files
  const sourceFiles = files.filter((f) => /\.(jsx?|tsx?)$/.test(f.path));

  const detectedPackages = new Set<string>();
  const importRe =
    /(?:import\s+(?:.+?\s+from\s+)?['"]|require\s*\(\s*['"])([^'"./][^'"]*)['"]/g;

  for (const f of sourceFiles) {
    let match: RegExpExecArray | null;
    while ((match = importRe.exec(f.content)) !== null) {
      const pkg = match[1];
      // Normalise scoped (@org/pkg) vs plain (pkg)
      const root = pkg.startsWith("@")
        ? pkg.split("/").slice(0, 2).join("/")
        : pkg.split("/")[0];
      if (root && !["react", "react-dom"].includes(root)) {
        detectedPackages.add(root);
      }
    }
  }

  const extraDeps: Record<string, string> = {};
  for (const pkg of detectedPackages) {
    extraDeps[pkg] = KNOWN_PACKAGE_VERSIONS[pkg] ?? "latest";
  }

  return JSON.stringify(
    {
      name: projectName.replace(/\s+/g, "-").toLowerCase() || "react-app",
      version: "0.0.0",
      private: true,
      scripts: { dev: "vite", build: "vite build" },
      dependencies: {
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        ...extraDeps,
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.4",
        vite: "^5.4.10",
      },
    },
    null,
    2,
  );
}

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

  // Stable outer wrapper — React manages this ref, StackBlitz never touches it
  const embedWrapperRef = useRef<HTMLDivElement>(null);
  const vmRef = useRef<VM | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const hasProject = generatedFiles.length > 0;

  // Mount StackBlitz with default template on first render.
  // We create a fresh inner div each run so React Strict Mode's double-invoke
  // doesn't pass a detached element (no parentNode) to the SDK.
  useEffect(() => {
    const wrapper = embedWrapperRef.current;
    if (!wrapper) return;

    // Clear any previous iframe injected by the SDK
    wrapper.innerHTML = "";

    // Fresh mount target – the SDK will replace this div with an <iframe>
    const mountTarget = document.createElement("div");
    mountTarget.style.cssText = "width:100%;height:100%";
    wrapper.appendChild(mountTarget);

    let isMounted = true;
    sdk
      .embedProject(
        mountTarget,
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
      vmRef.current = null;
    };
  }, []);

  // Auto-scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamLog]);

  // Build a fresh StackBlitz embed inside the stable wrapper div
  const remountEmbed = useCallback(
    async (files: Record<string, string>, openFile: string, title: string) => {
      const wrapper = embedWrapperRef.current;
      if (!wrapper) return;
      wrapper.innerHTML = "";
      const mountTarget = document.createElement("div");
      mountTarget.style.cssText = "width:100%;height:100%";
      wrapper.appendChild(mountTarget);
      vmRef.current = await sdk.embedProject(
        mountTarget,
        { title, template: "node", files },
        {
          height: "100%",
          hideNavigation: false,
          forceEmbedLayout: true,
          openFile,
          view: "default",
          theme: "dark",
        },
      );
    },
    [],
  );

  const updateEmbedFiles = useCallback(
    async (files: CodeFile[], title: string) => {
      // Pick the best file to focus: prefer App.jsx/tsx, then first jsx/js
      const mainFile =
        files.find(
          (f) => f.path === "src/App.jsx" || f.path === "src/App.tsx",
        ) ??
        files.find(
          (f) =>
            f.path.endsWith(".jsx") ||
            f.path.endsWith(".tsx") ||
            f.path.endsWith(".js"),
        ) ??
        files[0];
      const openPath = mainFile?.path ?? "src/App.jsx";

      // Build the full file set: start with defaults, overlay AI-generated files
      const allFiles: Record<string, string> = { ...DEFAULT_TEMPLATE_FILES };

      for (const f of files) {
        // Skip AI's package.json — we build our own below with detected deps
        if (f.path === "package.json") continue;
        allFiles[f.path] = f.content;
      }

      // Always build a correct package.json from detected imports
      allFiles["package.json"] = buildPackageJsonFromFiles(files, title);

      // Always do a full remount so WebContainers runs a fresh npm install
      // with all required dependencies properly resolved
      await remountEmbed(allFiles, openPath, title);
    },
    [remountEmbed],
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

  const handleNewProject = useCallback(() => {
    setGeneratedFiles([]);
    setStreamLog("");
    setError(null);
    setPrompt("");
    setRefineFeedback("");
    setProjectName("my-app");
    // Reset the StackBlitz embed back to the welcome placeholder
    remountEmbed(DEFAULT_TEMPLATE_FILES, "src/App.jsx", "Code Builder");
  }, [remountEmbed]);

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
          <div ref={embedWrapperRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
