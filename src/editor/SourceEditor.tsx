import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState, Transaction } from "@codemirror/state";
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers
} from "@codemirror/view";
import { sourceEditorTheme, sourceHighlightStyle } from "./source-editor-theme";
import type { HeadingItem } from "../app/app-types";
import { findHeadingAtSourceLine, sourceReadingPosition } from "./source-navigation";
import { sectionProgress, type SourceNavigationApi, type SourceNavigationTarget } from "./reading-position";

interface SourceEditorProps {
  markdown: string;
  onChangeMarkdown: (markdown: string) => void;
  headings?: HeadingItem[];
  navigationTarget?: SourceNavigationTarget | null;
  onActiveHeadingChange?: (headingId: string) => void;
  onRegisterNavigationApi?: (api: SourceNavigationApi | null) => void;
}

export function SourceEditor({ markdown, onChangeMarkdown, headings, navigationTarget, onActiveHeadingChange, onRegisterNavigationApi }: SourceEditorProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChangeMarkdown);
  const pendingMarkdownRef = useRef<string | null>(null);
  const changeFrameRef = useRef<number | null>(null);
  const headingsRef = useRef(headings ?? []);
  const onActiveHeadingChangeRef = useRef(onActiveHeadingChange);
  const onRegisterNavigationApiRef = useRef(onRegisterNavigationApi);
  const activeHeadingRef = useRef("");
  const activeFrameRef = useRef<number | null>(null);
  const navigationFrameRef = useRef<number | null>(null);
  const navigationLockRef = useRef<{
    headingId: string;
    isAligning: boolean;
    windowTop: number;
    innerTop: number;
  } | null>(null);
  const navigationVersionRef = useRef(0);

  useEffect(() => {
    onChangeRef.current = onChangeMarkdown;
  }, [onChangeMarkdown]);

  useEffect(() => {
    onRegisterNavigationApiRef.current = onRegisterNavigationApi;
  }, [onRegisterNavigationApi]);

  useEffect(() => {
    headingsRef.current = headings ?? [];
    onActiveHeadingChangeRef.current = onActiveHeadingChange;
    if (navigationLockRef.current && !headingsRef.current.some(({ id }) => id === navigationLockRef.current?.headingId)) {
      navigationLockRef.current = null;
    }
    scheduleActiveHeadingUpdate();
  }, [headings, onActiveHeadingChange]);

  useEffect(() => {
    if (!editorHostRef.current) {
      return;
    }

    const editorView = new EditorView({
      parent: editorHostRef.current,
      state: EditorState.create({
        doc: markdown,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          bracketMatching(),
          markdownLanguage(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          sourceHighlightStyle,
          EditorView.lineWrapping,
          highlightActiveLine(),
          sourceEditorTheme,
          keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
          EditorView.updateListener.of((update) => {
            const isExternalUpdate = update.transactions.some((transaction) => transaction.annotation(Transaction.remote));

            if (update.docChanged && !isExternalUpdate) {
              scheduleMarkdownChange(update.state.doc.toString());
            }

            if (update.docChanged) {
              releaseNavigation();
            }
            if (update.docChanged || update.viewportChanged || update.geometryChanged) {
              scheduleActiveHeadingUpdate();
            }
          })
        ]
      })
    });

    editorViewRef.current = editorView;
    onRegisterNavigationApiRef.current?.({
      getReadingPosition() {
        const view = editorViewRef.current;
        if (!view) return null;
        const bounds = view.scrollDOM.getBoundingClientRect();
        const readingY = sourceReadingPosition(window.innerHeight, bounds.top, bounds.bottom);
        const block = view.lineBlockAtHeight(Math.max(0, readingY - view.documentTop));
        const currentHeadings = headingsRef.current;
        const heading = currentHeadings.find(({ id }) => id === navigationLockRef.current?.headingId)
          ?? findHeadingAtSourceLine(currentHeadings, view.state.doc.lineAt(block.from).number);
        const nextHeading = heading ? currentHeadings[currentHeadings.indexOf(heading) + 1] : undefined;
        const start = heading ? view.lineBlockAt(view.state.doc.line(Math.min(heading.lineNumber, view.state.doc.lines)).from).top : 0;
        const end = nextHeading
          ? view.lineBlockAt(view.state.doc.line(Math.min(nextHeading.lineNumber, view.state.doc.lines)).from).top
          : view.contentHeight;
        return {
          headingId: heading?.id ?? "",
          progress: sectionProgress(readingY - view.documentTop, start, end),
          atStart: window.scrollY <= 1 && view.scrollDOM.scrollTop <= 1
        };
      },
      flushPendingChanges: flushPendingMarkdownChange
    });
    scheduleActiveHeadingUpdate();
    const onScrollKey = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
        releaseNavigation();
      }
    };
    const onScroll = () => {
      const navigation = navigationLockRef.current;
      if (navigation && !navigation.isAligning && (
        Math.abs(window.scrollY - navigation.windowTop) > 2 ||
        Math.abs(editorView.scrollDOM.scrollTop - navigation.innerTop) > 2
      )) {
        releaseNavigation();
      } else {
        scheduleActiveHeadingUpdate();
      }
    };
    editorView.scrollDOM.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", releaseNavigation);
    window.addEventListener("wheel", releaseNavigation, { passive: true });
    window.addEventListener("touchmove", releaseNavigation, { passive: true });
    window.addEventListener("pointerdown", releaseNavigation);
    window.addEventListener("keydown", onScrollKey);

    return () => {
      cancelPendingMarkdownChange();
      onRegisterNavigationApiRef.current?.(null);
      navigationVersionRef.current += 1;
      if (activeFrameRef.current !== null) window.cancelAnimationFrame(activeFrameRef.current);
      if (navigationFrameRef.current !== null) window.cancelAnimationFrame(navigationFrameRef.current);
      activeFrameRef.current = null;
      navigationFrameRef.current = null;
      editorView.scrollDOM.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", releaseNavigation);
      window.removeEventListener("wheel", releaseNavigation);
      window.removeEventListener("touchmove", releaseNavigation);
      window.removeEventListener("pointerdown", releaseNavigation);
      window.removeEventListener("keydown", onScrollKey);
      editorView.destroy();
      editorViewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (!editorView || editorView.state.doc.toString() === markdown) {
      return;
    }

    cancelPendingMarkdownChange();
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: markdown
      },
      annotations: Transaction.remote.of(true)
    });
  }, [markdown]);

  useEffect(() => {
    const editorView = editorViewRef.current;
    const heading = headingsRef.current.find(({ id }) => id === navigationTarget?.headingId);
    if (!editorView || !navigationTarget || (navigationTarget.headingId && !heading)) return;

    const headingId = heading?.id ?? "";
    navigationLockRef.current = { headingId, isAligning: true, windowTop: 0, innerTop: 0 };
    const navigationVersion = ++navigationVersionRef.current;
    const navigatingView = editorView;
    const targetLineNumber = heading?.lineNumber ?? 1;
    const targetProgress = Math.max(0, Math.min(1, navigationTarget.progress ?? 0));
    const atStart = navigationTarget.atStart ?? false;
    reportActiveHeading(headingId);
    // Distant wrapped lines initially have estimated heights. Re-measure after
    // CodeMirror renders the destination; scroll only the intended containers.
    function alignHeading(attempt = 0) {
      if (editorViewRef.current !== navigatingView || navigationVersionRef.current !== navigationVersion) return;
      navigatingView.requestMeasure({
        key: navigationVersionRef,
        read(view) {
          const sourceLine = view.state.doc.line(Math.min(targetLineNumber, view.state.doc.lines));
          const start = view.lineBlockAt(sourceLine.from).top;
          const nextHeading = heading ? headingsRef.current[headingsRef.current.findIndex(({ id }) => id === headingId) + 1] : undefined;
          const end = nextHeading
            ? view.lineBlockAt(view.state.doc.line(Math.min(nextHeading.lineNumber, view.state.doc.lines)).from).top
            : view.contentHeight;
          const lineTop = view.documentTop + start + (end - start) * targetProgress;
          const scroller = view.scrollDOM;
          const scrollerRect = scroller.getBoundingClientRect();
          const activationOffset = Math.min(128, window.innerHeight * 0.24);
          const scrollsInternally = scroller.scrollHeight > scroller.clientHeight + 1;
          const innerOffset = Math.min(28, scroller.clientHeight * 0.1);
          const desiredInnerTop = scrollerRect.top + innerOffset;
          const innerTop = atStart ? 0 : scrollsInternally
            ? Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, scroller.scrollTop + (lineTop - desiredInnerTop) / view.scaleY))
            : scroller.scrollTop;
          const adjustedLineTop = lineTop - (innerTop - scroller.scrollTop) * view.scaleY;
          const shouldScrollWindow = !scrollsInternally || desiredInnerTop < activationOffset || desiredInnerTop > window.innerHeight - 60;
          const maxWindowTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          const windowTop = atStart ? 0 : shouldScrollWindow
            ? Math.max(0, Math.min(maxWindowTop, window.scrollY + adjustedLineTop - activationOffset))
            : window.scrollY;
          return { innerTop, windowTop, windowLeft: window.scrollX,
            moved: Math.abs(innerTop - scroller.scrollTop) > 1 || Math.abs(windowTop - window.scrollY) > 1 };
        },
        write(measure, view) {
          if (editorViewRef.current !== view || navigationVersionRef.current !== navigationVersion) return;
          view.scrollDOM.scrollTo({ top: measure.innerTop, behavior: "instant" });
          window.scrollTo({ top: measure.windowTop, left: measure.windowLeft, behavior: "instant" });
          if (attempt < 7 && (measure.moved || attempt < 2)) {
            navigationFrameRef.current = window.requestAnimationFrame(() => {
              navigationFrameRef.current = null;
              alignHeading(attempt + 1);
            });
          } else if (navigationLockRef.current) {
            navigationLockRef.current = {
              headingId: navigationLockRef.current.headingId,
              isAligning: false,
              windowTop: measure.windowTop,
              innerTop: measure.innerTop
            };
          }
        }
      });
    }
    alignHeading();

    return () => {
      navigationVersionRef.current += 1;
      if (navigationFrameRef.current !== null) window.cancelAnimationFrame(navigationFrameRef.current);
      navigationFrameRef.current = null;
    };
  }, [navigationTarget]);

  function reportActiveHeading(headingId: string) {
    if (activeHeadingRef.current === headingId) return;
    activeHeadingRef.current = headingId;
    onActiveHeadingChangeRef.current?.(headingId);
  }

  function releaseNavigation(event?: Event) {
    // 点击视图切换栏时保留显式目录定位，供下一视图捕获；文末标题可能无法滚到阅读线。
    if (event?.type === "pointerdown" && event.target instanceof Element && event.target.closest(".view-switcher")) return;
    navigationLockRef.current = null;
    navigationVersionRef.current += 1;
    if (navigationFrameRef.current !== null) window.cancelAnimationFrame(navigationFrameRef.current);
    navigationFrameRef.current = null;
    scheduleActiveHeadingUpdate();
  }

  function scheduleActiveHeadingUpdate() {
    if (activeFrameRef.current !== null) return;
    activeFrameRef.current = window.requestAnimationFrame(() => {
      activeFrameRef.current = null;
      const editorView = editorViewRef.current;
      if (!editorView) return;
      editorView.requestMeasure({
        key: activeFrameRef,
        read(view) {
          const bounds = view.scrollDOM.getBoundingClientRect();
          const readingY = sourceReadingPosition(window.innerHeight, bounds.top, bounds.bottom);
          const block = view.lineBlockAtHeight(Math.max(0, readingY - view.documentTop));
          return findHeadingAtSourceLine(headingsRef.current, view.state.doc.lineAt(block.from).number)?.id ?? "";
        },
        write(headingId, view) {
          if (editorViewRef.current === view) reportActiveHeading(navigationLockRef.current?.headingId ?? headingId);
        }
      });
    });
  }

  function scheduleMarkdownChange(nextMarkdown: string) {
    pendingMarkdownRef.current = nextMarkdown;

    if (changeFrameRef.current !== null) {
      return;
    }

    changeFrameRef.current = window.requestAnimationFrame(() => {
      changeFrameRef.current = null;
      const pendingMarkdown = pendingMarkdownRef.current;
      pendingMarkdownRef.current = null;

      if (pendingMarkdown !== null) {
        onChangeRef.current(pendingMarkdown);
      }
    });
  }

  function cancelPendingMarkdownChange() {
    if (changeFrameRef.current !== null) {
      window.cancelAnimationFrame(changeFrameRef.current);
      changeFrameRef.current = null;
    }

    pendingMarkdownRef.current = null;
  }

  function flushPendingMarkdownChange() {
    const pendingMarkdown = pendingMarkdownRef.current;
    cancelPendingMarkdownChange();
    if (pendingMarkdown !== null) onChangeRef.current(pendingMarkdown);
  }

  return <div className="source-editor" ref={editorHostRef} aria-label="Markdown 源码编辑器" />;
}

export default SourceEditor;
