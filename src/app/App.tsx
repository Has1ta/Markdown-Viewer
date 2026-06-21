import { useMemo, useState } from "react";
import { BookOpen, Columns2, FileCode2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { initialAppState } from "./app-state";
import type { ViewMode } from "./app-types";
import { parseHeadings } from "../markdown/parse-headings";
import { getMarkdownStats } from "../markdown/markdown-stats";

const viewModes: Array<{ value: ViewMode; label: string; icon: typeof BookOpen }> = [
  { value: "render", label: "渲染", icon: BookOpen },
  { value: "source", label: "源码", icon: FileCode2 },
  { value: "split", label: "双栏", icon: Columns2 }
];

export function App() {
  const [markdown, setMarkdown] = useState(initialAppState.markdown);
  const [viewMode, setViewMode] = useState<ViewMode>(initialAppState.viewMode);

  const headings = useMemo(() => parseHeadings(markdown), [markdown]);
  const stats = useMemo(() => getMarkdownStats(markdown, headings.length), [headings.length, markdown]);

  return (
    <AppShell
      markdown={markdown}
      fileName={initialAppState.fileName}
      filePath={initialAppState.filePath}
      isDirty={initialAppState.isDirty}
      lastSavedLabel={initialAppState.lastSavedLabel}
      viewMode={viewMode}
      viewModes={viewModes}
      headings={headings}
      stats={stats}
      onChangeMarkdown={setMarkdown}
      onChangeViewMode={setViewMode}
    />
  );
}
