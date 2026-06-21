import { Suspense, lazy, useEffect, useRef, useState, type ComponentType, type DragEvent } from "react";
import { ArrowUp, FolderOpen, PanelLeft, Save, SaveAll, X } from "lucide-react";
import type { DocumentStats, HeadingItem, RecentFile, ViewMode } from "../app/app-types";
import { BottomBar } from "./BottomBar";
import { DropOverlay } from "./DropOverlay";
import { DocumentHeader } from "./DocumentHeader";
import { Sidebar } from "./Sidebar";
import { RenderEditor } from "../editor/RenderEditor";
import { EmptyState } from "./EmptyState";
import { Toast } from "./Toast";

const SourceEditor = lazy(() => import("../editor/SourceEditor").then((module) => ({ default: module.SourceEditor })));
const SplitEditor = lazy(() => import("../editor/SplitEditor").then((module) => ({ default: module.SplitEditor })));

interface AppShellProps {
  markdown: string;
  fileName: string;
  filePath: string | null;
  isDirty: boolean;
  lastSavedLabel: string;
  viewMode: ViewMode;
  viewModes: Array<{ value: ViewMode; label: string; icon: ComponentType<{ size?: number }> }>;
  headings: HeadingItem[];
  recentFiles: RecentFile[];
  stats: DocumentStats;
  toastMessage: string | null;
  onChangeMarkdown: (markdown: string) => void;
  onChangeViewMode: (viewMode: ViewMode) => void;
  onOpenFile: () => void;
  onOpenRecentFile: (filePath: string) => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
  onDropFiles: (files: File[]) => void;
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
  recentFiles,
  stats,
  toastMessage,
  onChangeMarkdown,
  onChangeViewMode,
  onOpenFile,
  onOpenRecentFile,
  onSaveFile,
  onSaveFileAs,
  onDropFiles
}: AppShellProps) {
  const [activeHeadingId, setActiveHeadingId] = useState(headings[0]?.id ?? "");
  const [pendingHeadingId, setPendingHeadingId] = useState<string | null>(null);
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);
  const navigationInProgressRef = useRef(false);
  const isDraggingFile = dragDepth > 0;

  useEffect(() => {
    setActiveHeadingId((currentId) => {
      if (headings.some((heading) => heading.id === currentId)) {
        return currentId;
      }

      return headings[0]?.id ?? "";
    });
  }, [headings]);

  useEffect(() => {
    if (viewMode !== "render" || headings.length === 0) {
      return;
    }

    let frameId: number | null = null;

    function updateActiveHeadingFromScroll() {
      frameId = null;

      if (navigationInProgressRef.current) {
        return;
      }

      const headingElements = headings
        .map((heading) => ({ heading, element: document.getElementById(heading.id) }))
        .filter((entry): entry is { heading: HeadingItem; element: HTMLElement } => entry.element !== null);

      if (headingElements.length === 0) {
        return;
      }

      const activationOffset = Math.min(128, window.innerHeight * 0.24);
      let nextActiveHeading = headingElements[0].heading;

      for (const { heading, element } of headingElements) {
        if (element.getBoundingClientRect().top > activationOffset) {
          break;
        }

        nextActiveHeading = heading;
      }

      setActiveHeadingId((currentId) => (currentId === nextActiveHeading.id ? currentId : nextActiveHeading.id));
    }

    function scheduleActiveHeadingUpdate() {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(updateActiveHeadingFromScroll);
    }

    scheduleActiveHeadingUpdate();
    window.addEventListener("scroll", scheduleActiveHeadingUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveHeadingUpdate);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", scheduleActiveHeadingUpdate);
      window.removeEventListener("resize", scheduleActiveHeadingUpdate);
    };
  }, [headings, viewMode]);

  useEffect(() => {
    if (viewMode !== "render" || pendingHeadingId === null) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollToHeading(pendingHeadingId);
      setPendingHeadingId(null);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pendingHeadingId, viewMode]);

  function scrollToHeading(headingId: string) {
    const headingElement = document.getElementById(headingId);
    if (!headingElement) {
      return;
    }

    navigationInProgressRef.current = true;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const activationOffset = Math.min(128, window.innerHeight * 0.24);
    const headingTop = headingElement.getBoundingClientRect().top + window.scrollY - activationOffset;
    const nextScrollTop = Math.max(headingTop, 0);
    const shouldSmoothScroll = !prefersReducedMotion && Math.abs(nextScrollTop - window.scrollY) < 900;
    window.scrollTo({ top: nextScrollTop, behavior: shouldSmoothScroll ? "smooth" : "auto" });
    setActiveHeadingId(headingId);
    window.setTimeout(() => {
      navigationInProgressRef.current = false;
    }, shouldSmoothScroll ? 900 : 120);
  }

  function handleSelectHeading(headingId: string) {
    setIsMobileTocOpen(false);

    if (viewMode !== "render") {
      setPendingHeadingId(headingId);
      onChangeViewMode("render");
      return;
    }

    scrollToHeading(headingId);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    setDragDepth((currentDepth) => currentDepth + 1);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    setDragDepth((currentDepth) => Math.max(0, currentDepth - 1));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    setDragDepth(0);
    onDropFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="app-shell" onDragEnter={handleDragEnter} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <aside className="app-sidebar" aria-label="文档目录">
        <Sidebar
          headings={headings}
          activeHeadingId={activeHeadingId}
          recentFiles={recentFiles}
          onSelectHeading={handleSelectHeading}
          onOpenRecentFile={onOpenRecentFile}
        />
      </aside>

      <main className="app-main">
        <div className="mobile-toolbar">
          <button
            className="icon-button"
            type="button"
            aria-label="打开目录"
            aria-expanded={isMobileTocOpen}
            onClick={() => setIsMobileTocOpen(true)}
          >
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
                role="tab"
                className={isActive ? "view-button is-active" : "view-button"}
                aria-controls="document-editor-surface"
                aria-selected={isActive}
                onClick={() => onChangeViewMode(item.value)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <section className="editor-surface" id="document-editor-surface" aria-label="文档内容">
          {viewMode === "render" && <RenderEditor markdown={markdown} filePath={filePath} onChangeMarkdown={onChangeMarkdown} />}
          {viewMode === "source" && (
            <Suspense fallback={<EmptyState title="正在准备源码视图" description="编辑器资源加载完成后即可继续精修 Markdown。" />}>
              <SourceEditor markdown={markdown} onChangeMarkdown={onChangeMarkdown} />
            </Suspense>
          )}
          {viewMode === "split" && (
            <Suspense fallback={<EmptyState title="正在准备双栏视图" description="源码编辑器加载完成后会显示源码与渲染对照。" />}>
              <SplitEditor markdown={markdown} onChangeMarkdown={onChangeMarkdown} />
            </Suspense>
          )}
        </section>

        <BottomBar
          actions={[
            { label: "返回顶部", icon: ArrowUp, onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
            { label: "打开", icon: FolderOpen, onClick: onOpenFile },
            { label: "另存为", icon: SaveAll, onClick: onSaveFileAs },
            { label: "保存", icon: Save, primary: true, onClick: onSaveFile }
          ]}
        />
      </main>

      {isMobileTocOpen && (
        <div className="toc-drawer" role="dialog" aria-modal="true" aria-label="移动端文档目录">
          <button className="toc-backdrop" type="button" aria-label="关闭目录" onClick={() => setIsMobileTocOpen(false)} />
          <div className="toc-drawer-panel">
            <div className="toc-drawer-header">
              <span>文档目录</span>
              <button className="icon-button" type="button" aria-label="关闭目录" onClick={() => setIsMobileTocOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <Sidebar
              headings={headings}
              activeHeadingId={activeHeadingId}
              recentFiles={recentFiles}
              onSelectHeading={handleSelectHeading}
              onOpenRecentFile={onOpenRecentFile}
            />
          </div>
        </div>
      )}
      {isDraggingFile && <DropOverlay message="释放以打开 Markdown 文件" />}
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}

function hasDraggedFiles(event: DragEvent<HTMLDivElement>) {
  return Array.from(event.dataTransfer.types).includes("Files");
}
