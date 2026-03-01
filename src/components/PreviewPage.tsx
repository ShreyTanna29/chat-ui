import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import sdk from "@stackblitz/sdk";
import type { VM } from "@stackblitz/sdk";
import { Loader2, AlertCircle, Code2, ExternalLink } from "lucide-react";
import { fetchProject } from "@/services/codebuilder";
import { buildEmbedFiles } from "@/lib/codebuilderUtils";

export function PreviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const embedWrapperRef = useRef<HTMLDivElement>(null);
  const vmRef = useRef<VM | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    let isMounted = true;

    (async () => {
      try {
        const project = await fetchProject(slug);
        if (!isMounted) return;

        setProjectName(project.name);

        const { allFiles, openFile } = buildEmbedFiles(
          project.files,
          project.name,
        );

        const wrapper = embedWrapperRef.current;
        if (!wrapper) return;

        wrapper.innerHTML = "";
        const mountTarget = document.createElement("div");
        mountTarget.style.cssText = "width:100%;height:100%";
        wrapper.appendChild(mountTarget);

        const vm = await sdk.embedProject(
          mountTarget,
          { title: project.name, template: "node", files: allFiles },
          {
            height: "100%",
            hideNavigation: false,
            forceEmbedLayout: true,
            openFile,
            view: "preview",
            theme: "dark",
          },
        );
        if (isMounted) {
          vmRef.current = vm;
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message || "Failed to load project");
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      vmRef.current = null;
    };
  }, [slug]);

  return (
    <div className="flex flex-col h-screen bg-[#0e0e14] text-white">
      {/* Minimal header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-white/10 bg-[#13131a]">
        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
          <Code2 size={14} className="text-black" />
        </div>
        <span className="text-sm font-semibold truncate max-w-xs">
          {projectName || slug}
        </span>
        <a
          href="/"
          className="ml-auto flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors"
        >
          <ExternalLink size={13} />
          Open Erudite
        </a>
      </div>

      {/* Embed area */}
      <div className="flex-1 relative min-h-0">
        {isLoading && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0e0e14]">
            <Loader2 size={32} className="animate-spin text-white/60" />
            <p className="text-sm text-white/50">Loading project…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0e0e14]">
            <AlertCircle size={32} className="text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <a href="/" className="text-xs text-white/50 underline">
              Back to Erudite
            </a>
          </div>
        )}

        <div ref={embedWrapperRef} className="w-full h-full" />
      </div>
    </div>
  );
}
