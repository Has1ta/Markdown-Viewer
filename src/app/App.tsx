import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Columns2, FileCode2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { UnsavedChangesDialog, type UnsavedChangesChoice } from "../components/UnsavedChangesDialog";
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
  const [savedMarkdown, setSavedMarkdown] = useState(initialAppState.markdown);
  const [filePath, setFilePath] = useState<string | null>(initialAppState.filePath);
  const [fileName, setFileName] = useState(initialAppState.fileName);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(initialAppState.viewMode);
  const [unsavedDialog, setUnsavedDialog] = useState<{ actionLabel: string } | null>(null);
  const unsavedChoiceResolverRef = useRef<((choice: UnsavedChangesChoice) => void) | null>(null);
  const isDirtyRef = useRef(false);
  const markdownRef = useRef(markdown);
  const filePathRef = useRef(filePath);
  const fileNameRef = useRef(fileName);

  const headings = useMemo(() => parseHeadings(markdown), [markdown]);
  const stats = useMemo(() => getMarkdownStats(markdown, headings.length), [headings.length, markdown]);
  const isDirty = markdown !== savedMarkdown;
  const lastSavedLabel = lastSavedAt ? `保存于 ${formatSavedTime(lastSavedAt)}` : initialAppState.lastSavedLabel;

  useEffect(() => {
    isDirtyRef.current = isDirty;
    window.markdownViewer?.setDocumentEdited(isDirty);
    document.title = `${isDirty ? "• " : ""}${fileName} - Markdown Viewer v2`;
  }, [fileName, isDirty]);

  useEffect(() => {
    markdownRef.current = markdown;
  }, [markdown]);

  useEffect(() => {
    filePathRef.current = filePath;
  }, [filePath]);

  useEffect(() => {
    fileNameRef.current = fileName;
  }, [fileName]);

  useEffect(() => {
    const removeMenuListener = window.markdownViewer?.onMenuCommand((command) => {
      if (command === "open") {
        void handleOpenFile();
      }

      if (command === "save") {
        void handleSaveFile();
      }

      if (command === "save-as") {
        void handleSaveFileAs();
      }
    });
    const removeCloseListener = window.markdownViewer?.onCloseRequested(() => {
      void handleCloseRequested();
    });

    return () => {
      removeMenuListener?.();
      removeCloseListener?.();
    };
  }, []);

  async function handleOpenFile() {
    const canContinue = await confirmUnsavedChanges("打开其他文件");
    if (!canContinue) {
      return;
    }

    const result = await window.markdownViewer?.openMarkdownFile();
    if (!result || result.canceled || result.content === null || result.fileName === null) {
      return;
    }

    setMarkdown(result.content);
    setSavedMarkdown(result.content);
    setFilePath(result.filePath);
    setFileName(result.fileName);
    setLastSavedAt(new Date());
    setViewMode("render");
  }

  async function handleSaveFile() {
    await saveCurrentDocument(false);
  }

  async function handleSaveFileAs() {
    await saveCurrentDocument(true);
  }

  async function handleCloseRequested() {
    const canClose = await confirmUnsavedChanges("关闭窗口");
    window.markdownViewer?.confirmClose(canClose);
  }

  async function confirmUnsavedChanges(actionLabel: string) {
    if (!isDirtyRef.current) {
      return true;
    }

    const choice = await requestUnsavedChoice(actionLabel);

    if (choice === "cancel") {
      return false;
    }

    if (choice === "discard") {
      return true;
    }

    return saveCurrentDocument(false);
  }

  function requestUnsavedChoice(actionLabel: string) {
    return new Promise<UnsavedChangesChoice>((resolve) => {
      unsavedChoiceResolverRef.current = resolve;
      setUnsavedDialog({ actionLabel });
    });
  }

  function resolveUnsavedChoice(choice: UnsavedChangesChoice) {
    unsavedChoiceResolverRef.current?.(choice);
    unsavedChoiceResolverRef.current = null;
    setUnsavedDialog(null);
  }

  async function saveCurrentDocument(forceSaveAs: boolean) {
    const content = markdownRef.current;
    const defaultFileName = fileNameRef.current || "未命名文档.md";
    const result = forceSaveAs
      ? await window.markdownViewer?.saveMarkdownFileAs({ content, defaultFileName })
      : await window.markdownViewer?.saveMarkdownFile({
          filePath: filePathRef.current,
          content,
          defaultFileName
        });

    if (!result || result.canceled || result.fileName === null) {
      return false;
    }

    setSavedMarkdown(content);
    setFilePath(result.filePath);
    setFileName(result.fileName);
    setLastSavedAt(new Date());
    return true;
  }

  return (
    <>
      <AppShell
        markdown={markdown}
        fileName={fileName}
        filePath={filePath}
        isDirty={isDirty}
        lastSavedLabel={lastSavedLabel}
        viewMode={viewMode}
        viewModes={viewModes}
        headings={headings}
        stats={stats}
        onChangeMarkdown={setMarkdown}
        onChangeViewMode={setViewMode}
        onOpenFile={() => void handleOpenFile()}
        onSaveFile={() => void handleSaveFile()}
        onSaveFileAs={() => void handleSaveFileAs()}
      />
      {unsavedDialog && (
        <UnsavedChangesDialog actionLabel={unsavedDialog.actionLabel} fileName={fileName} onChoose={resolveUnsavedChoice} />
      )}
    </>
  );
}

function formatSavedTime(date: Date) {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
