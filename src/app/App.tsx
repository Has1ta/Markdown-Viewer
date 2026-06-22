import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Columns2, FileCode2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { UnsavedChangesDialog, type UnsavedChangesChoice } from "../components/UnsavedChangesDialog";
import { initialAppState } from "./app-state";
import type { RecentFile, ViewMode } from "./app-types";
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
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastId, setToastId] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>(initialAppState.viewMode);
  const [unsavedDialog, setUnsavedDialog] = useState<{ actionLabel: string } | null>(null);
  const unsavedChoiceResolverRef = useRef<((choice: UnsavedChangesChoice) => void) | null>(null);
  const isDirtyRef = useRef(false);
  const markdownRef = useRef(markdown);
  const filePathRef = useRef(filePath);
  const fileNameRef = useRef(fileName);
  const toastTimerRef = useRef<number | null>(null);

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
    void window.markdownViewer?.getRecentFiles().then((files) => setRecentFiles(files));

    const removeMenuListener = window.markdownViewer?.onMenuCommand((command, payload) => {
      if (command === "open") {
        void handleOpenFile();
      }

      if (command === "save") {
        void handleSaveFile();
      }

      if (command === "save-as") {
        void handleSaveFileAs();
      }

      if (command === "open-recent" && typeof payload === "string") {
        void handleOpenRecentFile(payload);
      }
    });
    const removeRecentFilesListener = window.markdownViewer?.onRecentFilesUpdated((files) => setRecentFiles(files));
    const removeCloseListener = window.markdownViewer?.onCloseRequested(() => {
      void handleCloseRequested();
    });
    const removeOpenFileRequestListener = window.markdownViewer?.onOpenFileRequested((requestedFilePath) => {
      void handleOpenFileByPath(requestedFilePath, "打开双击文件", "文件无法打开。");
    });

    return () => {
      removeMenuListener?.();
      removeRecentFilesListener?.();
      removeCloseListener?.();
      removeOpenFileRequestListener?.();
    };
  }, []);

  useEffect(() => {
    window.markdownViewer?.notifyReady();
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
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

    applyOpenedDocument(result);
  }

  async function handleOpenRecentFile(recentFilePath: string) {
    await handleOpenFileByPath(recentFilePath, "打开最近文件", "最近文件无法打开，已从本次会话列表移除。");
  }

  async function handleOpenFileByPath(targetFilePath: string, actionLabel: string, fallbackError: string) {
    const canContinue = await confirmUnsavedChanges(actionLabel);
    if (!canContinue) {
      return;
    }

    const result = await window.markdownViewer?.openMarkdownFileByPath(targetFilePath);
    if (!result || result.canceled || result.content === null || result.fileName === null) {
      showToast(result?.error ?? fallbackError);
      return;
    }

    applyOpenedDocument(result);
  }

  async function handleDroppedFiles(files: File[]) {
    const file = files[0];
    if (!file) {
      return;
    }

    if (!isMarkdownFileName(file.name)) {
      showToast("只能拖入 .md 或 .markdown 文件。");
      return;
    }

    const canContinue = await confirmUnsavedChanges("拖拽打开文件");
    if (!canContinue) {
      return;
    }

    const filePathFromElectron = window.markdownViewer?.getPathForFile(file) ?? "";
    if (filePathFromElectron) {
      const result = await window.markdownViewer?.openMarkdownFileByPath(filePathFromElectron);
      if (!result || result.canceled || result.content === null || result.fileName === null) {
        showToast(result?.error ?? "拖拽文件读取失败。");
        return;
      }

      applyOpenedDocument(result);
      return;
    }

    try {
      const content = await file.text();
      applyOpenedDocument({
        canceled: false,
        filePath: null,
        fileName: file.name,
        content
      });
      showToast("已打开拖拽文件；当前环境未提供本地路径，保存时会进入另存为。");
    } catch {
      showToast("拖拽文件读取失败。");
    }
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
    rememberRecentFile(result.filePath, result.fileName);
    return true;
  }

  function applyOpenedDocument(result: MarkdownFileResult) {
    if (result.content === null || result.fileName === null) {
      return;
    }

    setMarkdown(result.content);
    setSavedMarkdown(result.content);
    setFilePath(result.filePath);
    setFileName(result.fileName);
    setLastSavedAt(new Date());
    setViewMode("render");
    rememberRecentFile(result.filePath, result.fileName);
  }

  function rememberRecentFile(nextFilePath: string | null, nextFileName: string | null) {
    if (!nextFilePath || !nextFileName) {
      return;
    }

    setRecentFiles((currentFiles) => [
      { filePath: nextFilePath, fileName: nextFileName },
      ...currentFiles.filter((file) => file.filePath !== nextFilePath)
    ].slice(0, 8));
  }

  function showToast(message: string) {
    setToastMessage(message);
    setToastId((currentId) => currentId + 1);

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3200);
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
        recentFiles={recentFiles}
        stats={stats}
        toastMessage={toastMessage}
        toastId={toastId}
        onChangeMarkdown={setMarkdown}
        onChangeViewMode={setViewMode}
        onOpenFile={() => void handleOpenFile()}
        onOpenRecentFile={(nextFilePath) => void handleOpenRecentFile(nextFilePath)}
        onSaveFile={() => void handleSaveFile()}
        onSaveFileAs={() => void handleSaveFileAs()}
        onDropFiles={(files) => void handleDroppedFiles(files)}
        onShowToast={showToast}
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

function isMarkdownFileName(fileName: string) {
  return /\.(md|markdown|mdown|mkd)$/i.test(fileName);
}
