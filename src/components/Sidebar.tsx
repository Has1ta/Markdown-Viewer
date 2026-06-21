import { ChevronDown } from "lucide-react";
import type { HeadingItem } from "../app/app-types";

interface SidebarProps {
  headings: HeadingItem[];
}

export function Sidebar({ headings }: SidebarProps) {
  return (
    <nav className="toc-panel">
      <div className="toc-header">
        <div>
          <span className="toc-eyebrow">Outline</span>
          <h2>文档目录</h2>
        </div>
        <button className="icon-button" type="button" aria-label="折叠目录">
          <ChevronDown size={18} />
        </button>
      </div>

      <ol className="toc-list">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a className={`toc-item level-${heading.level}`} href={`#${heading.id}`}>
              <span className="toc-index">{heading.index}</span>
              <span>{heading.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
