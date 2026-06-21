import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown as markdownLanguage } from "@codemirror/lang-markdown";
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
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
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          })
        ]
      })
    });

    editorViewRef.current = editorView;

    return () => {
      editorView.destroy();
      editorViewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (!editorView || editorView.state.doc.toString() === markdown) {
      return;
    }

    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: markdown
      }
    });
  }, [markdown]);

  return <div className="source-editor" ref={editorHostRef} aria-label="Markdown 源码编辑器" />;
}

export default SourceEditor;
