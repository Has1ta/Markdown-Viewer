import type { DocumentStats } from "../app/app-types";

export function getMarkdownStats(markdown: string, headingCount: number): DocumentStats {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_\-[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cjkCharacters = (plainText.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latinWords = (plainText.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) ?? []).length;
  const words = cjkCharacters + latinWords;
  const readingMinutes = Math.max(1, Math.ceil(words / 350));

  return {
    characters: plainText.length,
    words,
    headings: headingCount,
    readingMinutes
  };
}
