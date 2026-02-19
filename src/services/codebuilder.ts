import { apiRawFetch } from "./api";

export interface CodeFile {
  path: string;
  content: string;
  type: string;
}

export type StreamEvent =
  | { type: "chunk"; content: string }
  | { type: "complete"; files: CodeFile[]; totalFiles: number }
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
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const response = await apiRawFetch("/api/codebuilder/generate", {
    method: "POST",
    body: JSON.stringify({ prompt, projectName: projectName || "react-app" }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  yield* parseSSEStream(response);
}

export async function* streamRefineCode(
  files: Pick<CodeFile, "path" | "content">[],
  feedback: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const response = await apiRawFetch("/api/codebuilder/refine", {
    method: "POST",
    body: JSON.stringify({ files, feedback }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  yield* parseSSEStream(response);
}
