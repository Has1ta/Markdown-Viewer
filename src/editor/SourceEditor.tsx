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

interface SourceEditorProps {
  markdown: string;
  onChangeMarkdown: (markdown: string) => void;
}

export function SourceEditor({ markdown, onChangeMarkdown }: SourceEditorProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChangeMarkdown);
  const pendingMarkdownRef = useRef<string | null>(null);
  const changeFrameRef = useRef<number | null>(null);

  useEffect(() => {
    onChangeRef.current = onChangeMarkdown;
  }, [onChangeMarkdown]);

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
          })
        ]
      })
    });

    editorViewRef.current = editorView;

    return () => {
      cancelPendingMarkdownChange();
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

  return <div className="source-editor" ref={editorHostRef} aria-label="Markdown 源码编辑器" />;
}

export default SourceEditor;
