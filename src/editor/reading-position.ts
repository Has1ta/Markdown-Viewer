export interface ReadingPosition {
  headingId: string;
  progress: number;
  atStart: boolean;
}

export interface SourceNavigationTarget {
  headingId: string;
  requestId: number;
  progress?: number;
  atStart?: boolean;
}

export interface SourceNavigationApi {
  getReadingPosition: () => ReadingPosition | null;
  flushPendingChanges: () => void;
}

export function sectionProgress(readingTop: number, sectionTop: number, sectionBottom: number): number {
  if (sectionBottom <= sectionTop) return 0;
  return Math.min(1, Math.max(0, (readingTop - sectionTop) / (sectionBottom - sectionTop)));
}
