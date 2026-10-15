import { useEffect, useRef } from "react";
import { RenderEditEditor } from "./RenderEditEditor";
import { SourceEditor } from "./SourceEditor";
import { createInitialSyncSnapshot, createNextSyncSnapshot, type EditorUpdateSource } from "./editor-sync";
import type { HeadingItem } from "../app/app-types";
import type { SourceNavigationApi, SourceNavigationTarget } from "./reading-position";

interface SplitEditorProps {
  markdown: string;
  onChangeMarkdown: (markdown: string) => void;
  headings?: HeadingItem[];
  navigationTarget?: SourceNavigationTarget | null;
  onActiveHeadingChange?: (headingId: string) => void;
  onRegisterNavigationApi?: (api: SourceNavigationApi | null) => void;
}

export function SplitEditor({ markdown, onChangeMarkdown, headings, navigationTarget, onActiveHeadingChange, onRegisterNavigationApi }: SplitEditorProps) {
  const syncSnapshotRef = useRef(createInitialSyncSnapshot(markdown));

  useEffect(() => {
    if (syncSnapshotRef.current.markdown === markdown) {
      return;
    }

    syncSnapshotRef.current = createNextSyncSnapshot(syncSnapshotRef.current, markdown, "external");
  }, [markdown]);

  function handleChangeMarkdown(nextMarkdown: string, source: EditorUpdateSource) {
    syncSnapshotRef.current = createNextSyncSnapshot(syncSnapshotRef.current, nextMarkdown, source);
    onChangeMarkdown(nextMarkdown);
  }

  return (
    <div
      className="split-editor"
      data-sync-source={syncSnapshotRef.current.source}
      data-sync-version={syncSnapshotRef.current.version}
    >
      <div className="split-pane">
        <div className="split-pane-header">源码</div>
        <SourceEditor
          markdown={markdown}
          onChangeMarkdown={(nextMarkdown) => handleChangeMarkdown(nextMarkdown, "source")}
          headings={headings}
          navigationTarget={navigationTarget}
          onActiveHeadingChange={onActiveHeadingChange}
          onRegisterNavigationApi={onRegisterNavigationApi}
        />
      </div>
      <div className="split-pane">
        <div className="split-pane-header">渲染编辑</div>
        <RenderEditEditor
          markdown={markdown}
          onChangeMarkdown={(nextMarkdown) => handleChangeMarkdown(nextMarkdown, "render")}
        />
      </div>
    </div>
  );
}

export default SplitEditor;
