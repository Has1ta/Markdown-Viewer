import { Suspense, lazy, useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties, type DragEvent, type KeyboardEvent } from "react";
import { ArrowUp, FolderOpen, PanelLeft, Save, SaveAll, X } from "lucide-react";
import type { DocumentStats, HeadingItem, RecentFile, ViewMode } from "../app/app-types";
import { BottomBar } from "./BottomBar";
import { DropOverlay } from "./DropOverlay";
import { DocumentHeader } from "./DocumentHeader";
import { Sidebar } from "./Sidebar";
import { RenderEditor } from "../editor/RenderEditor";
import { EmptyState } from "./EmptyState";
import { Toast } from "./Toast";
import { sectionProgress, type ReadingPosition, type SourceNavigationApi } from "../editor/reading-position";

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
  toastId: number;
  onChangeMarkdown: (markdown: string) => void;
  onChangeViewMode: (viewMode: ViewMode) => void;
  onOpenFile: () => void;
  onOpenRecentFile: (filePath: string) => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
  onDropFiles: (files: File[]) => void;
  onShowToast: (message: string) => void;
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
  toastId,
  onChangeMarkdown,
  onChangeViewMode,
  onOpenFile,
  onOpenRecentFile,
  onSaveFile,
  onSaveFileAs,
  onDropFiles,
  onShowToast
}: AppShellProps) {
  const [activeHeadingId, setActiveHeadingId] = useState(headings[0]?.id ?? "");
  const [sourceNavigationTarget, setSourceNavigationTarget] = useState<{
    headingId: string;
    requestId: number;
    viewMode: ViewMode;
    filePath: string | null;
    progress?: number;
    atStart?: boolean;
  } | null>(null);
  const [pendingRenderPosition, setPendingRenderPosition] = useState<ReadingPosition | null>(null);
  const [compactSwitcher, setCompactSwitcher] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);
  const [backToTopLift, setBackToTopLift] = useState(0);
  const [dragDepth, setDragDepth] = useState(0);
  const bottomBarRef = useRef<HTMLElement | null>(null);
  const navigationInProgressRef = useRef(false);
  const navigationReleaseTimerRef = useRef<number | null>(null);
  const sourceNavigationRequestRef = useRef(0);
  const sourceNavigationApiRef = useRef<SourceNavigationApi | null>(null);
  const lastReadingPositionRef = useRef<ReadingPosition | null>(null);
  const isDraggingFile = dragDepth > 0;
  const currentSourceNavigationTarget = sourceNavigationTarget?.viewMode === viewMode && sourceNavigationTarget.filePath === filePath
    ? sourceNavigationTarget
    : null;

  const registerSourceNavigationApi = useCallback((api: SourceNavigationApi | null) => {
    sourceNavigationApiRef.current = api;
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setCompactSwitcher(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

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
    let frameId: number | null = null;

    function updateBackToTopState() {
      frameId = null;
      setIsBackToTopVisible(window.scrollY > 180);

      const bottomBarElement = bottomBarRef.current;
      if (!bottomBarElement) {
        setBackToTopLift(0);
        return;
      }

      const bottomBarRect = bottomBarElement.getBoundingClientRect();
      const isCompactViewport = window.matchMedia("(max-width: 767px)").matches;
      const restingBottomOffset = isCompactViewport ? 80 : 96;
      const clearance = 16;
      const nextLift = Math.max(0, Math.ceil(window.innerHeight - restingBottomOffset - bottomBarRect.top + clearance));
      setBackToTopLift(nextLift);
    }

    function scheduleBackToTopStateUpdate() {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(updateBackToTopState);
    }

    scheduleBackToTopStateUpdate();
    window.addEventListener("scroll", scheduleBackToTopStateUpdate, { passive: true });
    window.addEventListener("resize", scheduleBackToTopStateUpdate);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener("scroll", scheduleBackToTopStateUpdate);
      window.removeEventListener("resize", scheduleBackToTopStateUpdate);
    };
  }, []);

  useEffect(() => {
    setSourceNavigationTarget(null);
    setPendingRenderPosition(null);
    lastReadingPositionRef.current = null;
    navigationInProgressRef.current = false;
    if (navigationReleaseTimerRef.current !== null) {
      window.clearTimeout(navigationReleaseTimerRef.current);
      navigationReleaseTimerRef.current = null;
    }
  }, [filePath, fileName]);

  useEffect(() => {
    if (viewMode !== "render" || !pendingRenderPosition) return;

    const position = pendingRenderPosition;
    let isDisposed = false;
    let frameId = 0;
    navigationInProgressRef.current = true;
    setActiveHeadingId(position.headingId);

    function restorePosition(attempt = 0) {
      if (isDisposed) return;
      const article = document.querySelector<HTMLElement>(".markdown-body");
      const index = headings.findIndex(({ id }) => id === position.headingId);
      const heading = (position.headingId ? article?.querySelector<HTMLElement>(`#${CSS.escape(position.headingId)}`) : article) ?? article;
      if (!article || !heading) {
        navigationInProgressRef.current = false;
        setPendingRenderPosition(null);
        return;
      }
      const nextHeading = headings[index + 1];
      const nextElement = index >= 0 && nextHeading ? article.querySelector<HTMLElement>(`#${CSS.escape(nextHeading.id)}`) : null;
      const start = heading.getBoundingClientRect().top + window.scrollY;
      const end = (nextElement ?? article).getBoundingClientRect()[nextElement ? "top" : "bottom"] + window.scrollY;
      const offset = Math.min(128, window.innerHeight * 0.24);
      const top = position.atStart ? 0 : Math.max(0, start + (end - start) * position.progress - offset);
      const before = window.scrollY;
      window.scrollTo({ top, behavior: "instant" });
      if (attempt < 7 && (attempt < 2 || Math.abs(before - window.scrollY) > 1)) {
        frameId = window.requestAnimationFrame(() => restorePosition(attempt + 1));
      } else {
        setPendingRenderPosition(null);
        navigationInProgressRef.current = false;
      }
    }

    frameId = window.requestAnimationFrame(() => restorePosition());
    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [headings, pendingRenderPosition, viewMode]);

  useEffect(() => () => {
    if (navigationReleaseTimerRef.current !== null) {
      window.clearTimeout(navigationReleaseTimerRef.current);
    }
  }, []);

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
    if (navigationReleaseTimerRef.current !== null) {
      window.clearTimeout(navigationReleaseTimerRef.current);
    }
    navigationReleaseTimerRef.current = window.setTimeout(() => {
      navigationInProgressRef.current = false;
      navigationReleaseTimerRef.current = null;
    }, shouldSmoothScroll ? 900 : 120);
  }

  function handleSelectHeading(headingId: string) {
    setIsMobileTocOpen(false);

    if (viewMode !== "render") {
      setActiveHeadingId(headingId);
      sourceNavigationRequestRef.current += 1;
      setSourceNavigationTarget({ headingId, requestId: sourceNavigationRequestRef.current, viewMode, filePath });
      return;
    }

    scrollToHeading(headingId);
  }

  function handleSourceActiveHeadingChange(headingId: string) {
    setActiveHeadingId((currentId) => currentId === headingId ? currentId : headingId);
  }

  function captureRenderedPosition(): ReadingPosition | null {
    const article = document.querySelector<HTMLElement>(".markdown-body");
    if (!article) return null;
    const readingY = Math.min(128, window.innerHeight * 0.24);
    const elements = headings.map((heading) => ({ heading, element: article.querySelector<HTMLElement>(`#${CSS.escape(heading.id)}`) }))
      .filter((entry): entry is { heading: HeadingItem; element: HTMLElement } => entry.element !== null);
    let index = 0;
    for (let current = 0; current < elements.length; current += 1) {
      if (elements[current].element.getBoundingClientRect().top > readingY) break;
      index = current;
    }
    // 页尾空间不足以把目标标题置顶时，保留仍在屏幕内的目录定位章节。
    const activeIndex = elements.findIndex(({ heading }) => heading.id === activeHeadingId);
    if (activeIndex >= 0) {
      const activeTop = elements[activeIndex].element.getBoundingClientRect().top;
      if (activeTop > readingY && activeTop < window.innerHeight) index = activeIndex;
    }
    const heading = elements[index];
    const start = (heading?.element ?? article).getBoundingClientRect().top;
    const nextElement = elements[index + 1]?.element;
    const end = nextElement ? nextElement.getBoundingClientRect().top : article.getBoundingClientRect().bottom;
    return { headingId: heading?.heading.id ?? "", progress: sectionProgress(readingY, start, end), atStart: window.scrollY <= 1 };
  }

  function handleChangeViewMode(nextViewMode: ViewMode) {
    if (nextViewMode === viewMode) return;
    const position = (viewMode === "render" ? captureRenderedPosition() : sourceNavigationApiRef.current?.getReadingPosition())
      ?? lastReadingPositionRef.current
      ?? { headingId: activeHeadingId, progress: 0, atStart: window.scrollY <= 1 };
    lastReadingPositionRef.current = position;
    sourceNavigationApiRef.current?.flushPendingChanges();
    if (navigationReleaseTimerRef.current !== null) {
      window.clearTimeout(navigationReleaseTimerRef.current);
      navigationReleaseTimerRef.current = null;
    }
    navigationInProgressRef.current = true;
    setActiveHeadingId(position.headingId);
    sourceNavigationRequestRef.current += 1;
    if (nextViewMode === "render") {
      setSourceNavigationTarget(null);
      setPendingRenderPosition(position);
    } else {
      setPendingRenderPosition(null);
      setSourceNavigationTarget({ ...position, requestId: sourceNavigationRequestRef.current, viewMode: nextViewMode, filePath });
    }
    onChangeViewMode(nextViewMode);
  }

  function handleViewSwitcherKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const backwards = compactSwitcher ? "ArrowLeft" : "ArrowUp";
    const forwards = compactSwitcher ? "ArrowRight" : "ArrowDown";
    const currentIndex = viewModes.findIndex(({ value }) => value === viewMode);
    const index = event.key === "Home" ? 0 : event.key === "End" ? viewModes.length - 1
      : event.key === forwards ? (currentIndex + 1) % viewModes.length
      : event.key === backwards ? (currentIndex + viewModes.length - 1) % viewModes.length : -1;
    if (index < 0) return;
    event.preventDefault();
    event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=tab]")[index]?.focus({ preventScroll: true });
    handleChangeViewMode(viewModes[index].value);
  }

  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
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
          onOpenFile={onOpenFile}
        />

        <div className="view-switcher" role="tablist" aria-label="视图模式" aria-orientation={compactSwitcher ? "horizontal" : "vertical"} onKeyDown={handleViewSwitcherKeyDown}>
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
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleChangeViewMode(item.value)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <section className="editor-surface" id="document-editor-surface" aria-label="文档内容">
          {viewMode === "render" && (
            <RenderEditor markdown={markdown} filePath={filePath} onChangeMarkdown={onChangeMarkdown} onShowToast={onShowToast} />
          )}
          {viewMode === "source" && (
            <Suspense fallback={<EmptyState title="正在准备源码视图" description="编辑器资源加载完成后即可继续精修 Markdown。" />}>
              <SourceEditor
                markdown={markdown}
                onChangeMarkdown={onChangeMarkdown}
                headings={headings}
                navigationTarget={currentSourceNavigationTarget}
                onActiveHeadingChange={handleSourceActiveHeadingChange}
                onRegisterNavigationApi={registerSourceNavigationApi}
              />
            </Suspense>
          )}
          {viewMode === "split" && (
            <Suspense fallback={<EmptyState title="正在准备双栏视图" description="源码编辑器加载完成后会显示源码与渲染对照。" />}>
              <SplitEditor
                markdown={markdown}
                onChangeMarkdown={onChangeMarkdown}
                headings={headings}
                navigationTarget={currentSourceNavigationTarget}
                onActiveHeadingChange={handleSourceActiveHeadingChange}
                onRegisterNavigationApi={registerSourceNavigationApi}
              />
            </Suspense>
          )}
        </section>

        <BottomBar
          ref={bottomBarRef}
          actions={[
            { label: "返回顶部", icon: ArrowUp, onClick: scrollToTop },
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
      <button
        className={isBackToTopVisible ? "floating-back-to-top is-visible" : "floating-back-to-top"}
        type="button"
        aria-hidden={!isBackToTopVisible}
        aria-label="返回顶部"
        title="返回顶部"
        tabIndex={isBackToTopVisible ? 0 : -1}
        style={{ "--floating-back-to-top-lift": `${backToTopLift}px` } as CSSProperties}
        onClick={scrollToTop}
      >
        <ArrowUp size={20} />
      </button>
      {isDraggingFile && <DropOverlay message="释放以打开 Markdown 文件" />}
      {toastMessage && <Toast key={toastId} message={toastMessage} />}
    </div>
  );
}

function hasDraggedFiles(event: DragEvent<HTMLDivElement>) {
  return Array.from(event.dataTransfer.types).includes("Files");
}
