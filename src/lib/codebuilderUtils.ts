import type { CodeFile } from "@/services/codebuilder";

// Well-known npm packages and their latest stable versions
export const KNOWN_PACKAGE_VERSIONS: Record<string, string> = {
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

export const DEFAULT_TEMPLATE_FILES: Record<string, string> = {
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

/**
 * Scan generated source files for npm imports and return a package.json
 * that includes all detected third-party dependencies.
 */
export function buildPackageJsonFromFiles(
  files: CodeFile[],
  projectName: string,
): string {
  const aiPkgFile = files.find(
    (f) => f.path === "package.json" || f.path.endsWith("/package.json"),
  );
  if (aiPkgFile) {
    try {
      const parsed = JSON.parse(aiPkgFile.content);
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

  const sourceFiles = files.filter((f) => /\.(jsx?|tsx?)$/.test(f.path));
  const detectedPackages = new Set<string>();
  const importRe =
    /(?:import\s+(?:.+?\s+from\s+)?['"]|require\s*\(\s*['"])([^'"./][^'"]*)['"]/g;

  for (const f of sourceFiles) {
    let match: RegExpExecArray | null;
    while ((match = importRe.exec(f.content)) !== null) {
      const pkg = match[1];
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

/** Build the complete file map to pass to StackBlitz (merges defaults + AI files). */
export function buildEmbedFiles(
  files: CodeFile[],
  projectName: string,
): { allFiles: Record<string, string>; openFile: string } {
  const mainFile =
    files.find((f) => f.path === "src/App.jsx" || f.path === "src/App.tsx") ??
    files.find(
      (f) =>
        f.path.endsWith(".jsx") ||
        f.path.endsWith(".tsx") ||
        f.path.endsWith(".js"),
    ) ??
    files[0];
  const openFile = mainFile?.path ?? "src/App.jsx";

  const allFiles: Record<string, string> = { ...DEFAULT_TEMPLATE_FILES };
  for (const f of files) {
    if (f.path === "package.json") continue;
    allFiles[f.path] = f.content;
  }
  allFiles["package.json"] = buildPackageJsonFromFiles(files, projectName);

  return { allFiles, openFile };
}
