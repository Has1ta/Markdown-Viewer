import type { HeadingItem } from "../app/app-types";

export function findHeadingAtSourceLine(headings: HeadingItem[], lineNumber: number): HeadingItem | undefined {
  let low = 0;
  let high = headings.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (headings[middle].lineNumber <= lineNumber) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return headings[Math.max(0, high)];
}

export function sourceReadingPosition(viewportHeight: number, scrollerTop: number, scrollerBottom: number): number {
  const activationOffset = Math.min(128, viewportHeight * 0.24);
  const visibleTop = Math.max(0, scrollerTop);
  const visibleBottom = Math.min(viewportHeight, scrollerBottom);

  if (visibleBottom <= visibleTop) {
    return scrollerBottom <= 0 ? scrollerBottom - 1 : scrollerTop + 1;
  }

  return Math.min(visibleBottom - 1, Math.max(activationOffset, visibleTop + Math.min(28, (visibleBottom - visibleTop) / 2)));
}
