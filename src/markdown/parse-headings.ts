import type { HeadingItem } from "../app/app-types";
import { cleanHeadingText } from "./heading-text";
import { slugifyHeading } from "./slug";

export function parseHeadings(markdown: string): HeadingItem[] {
  const usedIds = new Map<string, number>();
  const headings: HeadingItem[] = [];
  let fence: { marker: string; length: number } | null = null;

  markdown.split(/\r?\n/).forEach((line, lineIndex) => {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);

    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence.marker && fenceMatch[1].length >= fence.length && !fenceMatch[2].trim()) {
        fence = null;
      }
      return;
    }

    if (fenceMatch && (fenceMatch[1][0] !== "`" || !fenceMatch[2].includes("`"))) {
      fence = { marker: fenceMatch[1][0], length: fenceMatch[1].length };
      return;
    }

    const match = /^ {0,3}(#{1,3})[ \t]+(.+?)\s*#*\s*$/.exec(line);
    if (!match) {
      return;
    }

    const level = match[1].length;
    const text = cleanHeadingText(match[2]);
    const baseId = slugifyHeading(text) || `heading-${headings.length + 1}`;
    const count = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, count + 1);

    headings.push({
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
      level,
      text,
      index: headings.length + 1,
      lineNumber: lineIndex + 1
    });
  });

  return headings;
}
