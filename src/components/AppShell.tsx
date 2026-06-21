import { useEffect, useRef, useState, type ComponentType } from "react";
import { ArrowUp, Copy, Download, MessageSquareText, PanelLeft, Save, X } from "lucide-react";
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
  const [activeHeadingId, setActiveHeadingId] = useState(headings[0]?.id ?? "");
  const [pendingHeadingId, setPendingHeadingId] = useState<string | null>(null);
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
  const navigationInProgressRef = useRef(false);

  useEffect(() => {
    setActiveHeadingId((currentId) => {
      if (headings.some((heading) => heading.id === currentId)) {
        return currentId;
      }

      return headings[0]?.id ?? "";
    });
  }, [headings]);

  useEffect(() => {
    if (viewMode !== "render") {
      return;
    }

    const headingElements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);

    if (headingElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (navigationInProgressRef.current) {
          return;
        }

        const visibleHeading = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)[0];

        if (visibleHeading?.target.id) {
          setActiveHeadingId(visibleHeading.target.id);
        }
      },
      {
        root: null,
        rootMargin: "-18% 0px -68% 0px",
        threshold: [0, 1]
      }
    );

    headingElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
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
    headingElement.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    setActiveHeadingId(headingId);
    window.setTimeout(() => {
      navigationInProgressRef.current = false;
    }, 420);
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

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="文档目录">
        <Sidebar headings={headings} activeHeadingId={activeHeadingId} onSelectHeading={handleSelectHeading} />
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
            <Sidebar headings={headings} activeHeadingId={activeHeadingId} onSelectHeading={handleSelectHeading} />
          </div>
        </div>
      )}
    </div>
  );
}
