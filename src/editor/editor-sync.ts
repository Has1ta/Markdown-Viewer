export type EditorUpdateSource = "source" | "render" | "external";

export interface EditorSyncSnapshot {
  markdown: string;
  source: EditorUpdateSource;
  version: number;
}

export function createInitialSyncSnapshot(markdown: string): EditorSyncSnapshot {
  return {
    markdown,
    source: "external",
    version: 0
  };
}

export function createNextSyncSnapshot(
  current: EditorSyncSnapshot,
  markdown: string,
  source: EditorUpdateSource
): EditorSyncSnapshot {
  if (current.markdown === markdown && current.source === source) {
    return current;
  }

  return {
    markdown,
    source,
    version: current.version + 1
  };
}
