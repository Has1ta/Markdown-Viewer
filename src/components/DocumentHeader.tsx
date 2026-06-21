import { FileText } from "lucide-react";
import type { DocumentStats } from "../app/app-types";

interface DocumentHeaderProps {
  fileName: string;
  filePath: string | null;
  isDirty: boolean;
  lastSavedLabel: string;
  stats: DocumentStats;
}

export function DocumentHeader({ fileName, filePath, isDirty, lastSavedLabel, stats }: DocumentHeaderProps) {
  return (
    <header className="document-header">
      <div className="document-kicker">
        <FileText size={17} />
        <span>{filePath ?? "内置示例文档"}</span>
      </div>
      <div className="document-title-row">
        <h1>{fileName.replace(/\.(md|markdown)$/i, "")}</h1>
        <span className={isDirty ? "status-pill is-dirty" : "status-pill"}>{isDirty ? "未保存" : "已同步"}</span>
      </div>
      <div className="document-meta" aria-label="文档统计">
        <span>{stats.characters} 字符</span>
        <span>{stats.words} 词</span>
        <span>{stats.headings} 章节</span>
        <span>约 {stats.readingMinutes} 分钟阅读</span>
        <span>{lastSavedLabel}</span>
      </div>
    </header>
  );
}
