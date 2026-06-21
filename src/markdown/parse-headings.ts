import type { HeadingItem } from "../app/app-types";
import { cleanHeadingText } from "./heading-text";
import { slugifyHeading } from "./slug";

export function parseHeadings(markdown: string): HeadingItem[] {
  const usedIds = new Map<string, number>();
  const headings: HeadingItem[] = [];
  let insideFence = false;

  markdown.split(/\r?\n/).forEach((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      insideFence = !insideFence;
      return;
    }

    if (insideFence) {
      return;
    }

    const match = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
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
      index: headings.length + 1
    });
  });

  return headings;
}
