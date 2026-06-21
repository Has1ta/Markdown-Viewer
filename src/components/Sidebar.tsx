import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Clock3 } from "lucide-react";
import type { HeadingItem, RecentFile } from "../app/app-types";

interface SidebarProps {
  headings: HeadingItem[];
  activeHeadingId: string;
  recentFiles: RecentFile[];
  onSelectHeading: (headingId: string) => void;
  onOpenRecentFile: (filePath: string) => void;
}

interface TocItem extends HeadingItem {
  displayIndex: string;
  hasChildren: boolean;
  isHidden: boolean;
}

export function Sidebar({ headings, activeHeadingId, recentFiles, onSelectHeading, onOpenRecentFile }: SidebarProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLOListElement | null>(null);
  const tocItems = useMemo(() => buildTocItems(headings, collapsedIds), [collapsedIds, headings]);
  const expandableIds = useMemo(() => tocItems.filter((item) => item.hasChildren).map((item) => item.id), [tocItems]);
  const hasCollapsedItems = expandableIds.some((headingId) => collapsedIds.has(headingId));

  useEffect(() => {
    const activeAncestorIds = getHeadingAncestorIds(headings, activeHeadingId);

    if (activeAncestorIds.length === 0) {
      return;
    }

    setCollapsedIds((currentIds) => {
      const nextIds = new Set(currentIds);
      let changed = false;

      activeAncestorIds.forEach((headingId) => {
        if (nextIds.delete(headingId)) {
          changed = true;
        }
      });

      return changed ? nextIds : currentIds;
    });
  }, [activeHeadingId, headings]);

  useEffect(() => {
    const listElement = listRef.current;
    const activeItem = listElement?.querySelector<HTMLElement>(".toc-item.is-active");

    if (!listElement || !activeItem) {
      return;
    }

    const listRect = listElement.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const edgePadding = 24;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (itemRect.top < listRect.top + edgePadding) {
      listElement.scrollBy({
        top: itemRect.top - listRect.top - edgePadding,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
      return;
    }

    if (itemRect.bottom > listRect.bottom - edgePadding) {
      listElement.scrollBy({
        top: itemRect.bottom - listRect.bottom + edgePadding,
        behavior: prefersReducedMotion ? "auto" : "smooth"
      });
    }
  }, [activeHeadingId]);

  function toggleCollapsed(headingId: string) {
    setCollapsedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(headingId)) {
        nextIds.delete(headingId);
      } else {
        nextIds.add(headingId);
      }

      return nextIds;
    });
  }

  function toggleAllCollapsed() {
    setCollapsedIds((currentIds) => {
      const shouldExpandAll = expandableIds.some((headingId) => currentIds.has(headingId));
      return shouldExpandAll ? new Set() : new Set(expandableIds);
    });
  }

  return (
    <nav className="toc-panel" aria-label="文档导航">
      <div className="toc-header">
        <div>
          <span className="toc-eyebrow">Outline</span>
          <h2>文档目录</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label={hasCollapsedItems ? "展开全部目录" : "折叠全部目录"}
          onClick={toggleAllCollapsed}
        >
          {hasCollapsedItems ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      <ol className="toc-list" ref={listRef} aria-label="标题目录">
        {tocItems.map((heading) => (
          <li key={heading.id} className={heading.isHidden ? "toc-list-item is-hidden" : "toc-list-item"}>
            <div className={`toc-row level-${heading.level}`}>
              <button
                className={heading.id === activeHeadingId ? "toc-item is-active" : "toc-item"}
                type="button"
                data-heading-id={heading.id}
                aria-current={heading.id === activeHeadingId ? "true" : undefined}
                onClick={() => onSelectHeading(heading.id)}
              >
                <span className="toc-index">{heading.displayIndex}</span>
                <span>{heading.text}</span>
              </button>
              {heading.hasChildren ? (
                <button
                  className="toc-toggle"
                  type="button"
                  aria-label={collapsedIds.has(heading.id) ? "展开子目录" : "折叠子目录"}
                  aria-expanded={!collapsedIds.has(heading.id)}
                  onClick={() => toggleCollapsed(heading.id)}
                >
                  {collapsedIds.has(heading.id) ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                </button>
              ) : (
                <span className="toc-toggle-spacer" aria-hidden="true" />
              )}
            </div>
          </li>
        ))}
      </ol>

      <section className="recent-panel" aria-label="最近文件">
        <div className="recent-header">
          <Clock3 size={15} />
          <span>最近文件</span>
        </div>
        {recentFiles.length > 0 ? (
          <ol className="recent-list">
            {recentFiles.map((file) => (
              <li key={file.filePath}>
                <button className="recent-item" type="button" title={file.filePath} onClick={() => onOpenRecentFile(file.filePath)}>
                  <span>{file.fileName}</span>
                  <small>{file.filePath}</small>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="recent-empty">本次会话暂无最近文件</p>
        )}
      </section>
    </nav>
  );
}

function getHeadingAncestorIds(headings: HeadingItem[], activeHeadingId: string) {
  const activeIndex = headings.findIndex((heading) => heading.id === activeHeadingId);

  if (activeIndex < 0) {
    return [];
  }

  const activeHeading = headings[activeIndex];
  const ancestorIds: string[] = [];
  let nextParentLevel = activeHeading.level - 1;

  for (let index = activeIndex - 1; index >= 0 && nextParentLevel >= 1; index -= 1) {
    const candidate = headings[index];

    if (candidate.level === nextParentLevel) {
      ancestorIds.push(candidate.id);
      nextParentLevel -= 1;
    }
  }

  return ancestorIds;
}

function buildTocItems(headings: HeadingItem[], collapsedIds: Set<string>): TocItem[] {
  const counters = [0, 0, 0, 0, 0, 0];
  const collapsedLevels: number[] = [];

  return headings.map((heading, index) => {
    while (collapsedLevels.length > 0 && heading.level <= collapsedLevels[collapsedLevels.length - 1]) {
      collapsedLevels.pop();
    }

    const isHidden = collapsedLevels.length > 0;

    counters[heading.level - 1] += 1;
    counters.fill(0, heading.level);

    const displayIndex = counters.slice(0, heading.level).filter(Boolean).join(".");
    const hasChildren = headings[index + 1]?.level > heading.level;

    if (collapsedIds.has(heading.id) && hasChildren) {
      collapsedLevels.push(heading.level);
    }

    return {
      ...heading,
      displayIndex,
      hasChildren,
      isHidden
    };
  });
}
