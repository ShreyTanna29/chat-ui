import { apiFetch, apiRawFetch, API_BASE_URL } from "./api";

export interface CodeFile {
  path: string;
  content: string;
  type: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export type StreamEvent =
  | { type: "chunk"; content: string }
  | {
      type: "complete";
      files: CodeFile[];
      totalFiles: number;
      usage?: TokenUsage | null;
    }
  | { type: "error"; message: string; code?: string };

async function* parseSSEStream(
  response: Response,
): AsyncGenerator<StreamEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      try {
        const event: StreamEvent = JSON.parse(trimmed.slice(6));
        yield event;
      } catch {
        // skip malformed lines
      }
    }
  }
}

export async function* streamGenerateCode(
  prompt: string,
  projectName?: string,
  image?: File,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("projectName", projectName || "react-app");
  if (image) {
    formData.append("image", image);
  }

  const response = await apiRawFetch("/api/codebuilder/generate", {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  yield* parseSSEStream(response);
}

export interface PublishedProject {
  slug: string;
  name: string;
  files: CodeFile[];
  createdAt: string;
}

/** Save all project files to the backend and return the shareable slug. */
export async function publishProject(
  name: string,
  files: CodeFile[],
): Promise<string> {
  const result = await apiFetch<{ slug: string }>("/api/codebuilder/projects", {
    method: "POST",
    body: JSON.stringify({ name, files }),
  });
  if (!result.success || !result.data?.slug) {
    throw new Error(result.message || "Failed to publish project");
  }
  return result.data.slug;
}

/** Fetch a published project by slug (no auth required). */
export async function fetchProject(slug: string): Promise<PublishedProject> {
  const res = await fetch(
    `${API_BASE_URL}/api/codebuilder/projects/${encodeURIComponent(slug)}`,
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Project not found");
  }
  return data.project as PublishedProject;
}
export async function* streamRefineCode(
  files: Pick<CodeFile, "path" | "content">[],
  feedback: string,
  image?: File,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const formData = new FormData();
  formData.append("files", JSON.stringify(files));
  formData.append("feedback", feedback);
  if (image) {
    formData.append("image", image);
  }

  const response = await apiRawFetch("/api/codebuilder/refine", {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  yield* parseSSEStream(response);
}
