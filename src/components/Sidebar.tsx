import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { HeadingItem } from "../app/app-types";

interface SidebarProps {
  headings: HeadingItem[];
  activeHeadingId: string;
  onSelectHeading: (headingId: string) => void;
}

interface TocItem extends HeadingItem {
  displayIndex: string;
  hasChildren: boolean;
  isHidden: boolean;
}

export function Sidebar({ headings, activeHeadingId, onSelectHeading }: SidebarProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLOListElement | null>(null);
  const tocItems = useMemo(() => buildTocItems(headings, collapsedIds), [collapsedIds, headings]);
  const expandableIds = useMemo(() => tocItems.filter((item) => item.hasChildren).map((item) => item.id), [tocItems]);
  const hasCollapsedItems = expandableIds.some((headingId) => collapsedIds.has(headingId));

  useEffect(() => {
    const activeItem = listRef.current?.querySelector<HTMLElement>(".toc-item.is-active");
    activeItem?.scrollIntoView({ block: "nearest" });
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
    <nav className="toc-panel">
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

      <ol className="toc-list" ref={listRef}>
        {tocItems.map((heading) => (
          <li key={heading.id} className={heading.isHidden ? "toc-list-item is-hidden" : "toc-list-item"}>
            <div className={`toc-row level-${heading.level}`}>
              <button
                className={heading.id === activeHeadingId ? "toc-item is-active" : "toc-item"}
                type="button"
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
    </nav>
  );
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
