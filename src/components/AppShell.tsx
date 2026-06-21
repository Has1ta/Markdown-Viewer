import type { ComponentType } from "react";
import { ArrowUp, Copy, Download, MessageSquareText, PanelLeft, Save } from "lucide-react";
import type { DocumentStats, HeadingItem, ViewMode } from "../app/app-types";
import { BottomBar } from "./BottomBar";
import { DocumentHeader } from "./DocumentHeader";
import { Sidebar } from "./Sidebar";
import { RenderEditor } from "../editor/RenderEditor";
import { SourceEditor } from "../editor/SourceEditor";
import { SplitEditor } from "../editor/SplitEditor";

interface AppShellProps {
  markdown: string;
  fileName: string;
  filePath: string | null;
  isDirty: boolean;
  lastSavedLabel: string;
  viewMode: ViewMode;
  viewModes: Array<{ value: ViewMode; label: string; icon: ComponentType<{ size?: number }> }>;
  headings: HeadingItem[];
  stats: DocumentStats;
  onChangeMarkdown: (markdown: string) => void;
  onChangeViewMode: (viewMode: ViewMode) => void;
}

export function AppShell({
  markdown,
  fileName,
  filePath,
  isDirty,
  lastSavedLabel,
  viewMode,
  viewModes,
  headings,
  stats,
  onChangeMarkdown,
  onChangeViewMode
}: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="文档目录">
        <Sidebar headings={headings} />
      </aside>

      <main className="app-main">
        <div className="mobile-toolbar">
          <button className="icon-button" type="button" aria-label="打开目录">
            <PanelLeft size={18} />
          </button>
          <span>{fileName}</span>
        </div>

        <DocumentHeader
          fileName={fileName}
          filePath={filePath}
          isDirty={isDirty}
          lastSavedLabel={lastSavedLabel}
          stats={stats}
        />

        <div className="view-switcher" role="tablist" aria-label="视图模式">
          {viewModes.map((item) => {
            const Icon = item.icon;
            const isActive = viewMode === item.value;

            return (
              <button
                key={item.value}
                type="button"
                className={isActive ? "view-button is-active" : "view-button"}
                aria-pressed={isActive}
                onClick={() => onChangeViewMode(item.value)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <section className="editor-surface" aria-label="文档内容">
          {viewMode === "render" && <RenderEditor markdown={markdown} />}
          {viewMode === "source" && <SourceEditor markdown={markdown} onChangeMarkdown={onChangeMarkdown} />}
          {viewMode === "split" && <SplitEditor markdown={markdown} onChangeMarkdown={onChangeMarkdown} />}
        </section>

        <BottomBar
          actions={[
            { label: "返回顶部", icon: ArrowUp },
            { label: "内容反馈", icon: MessageSquareText },
            { label: "复制链接", icon: Copy },
            { label: "导出", icon: Download },
            { label: "保存", icon: Save, primary: true }
          ]}
        />
      </main>
    </div>
  );
}
