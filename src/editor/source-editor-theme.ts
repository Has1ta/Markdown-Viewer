import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

export const sourceEditorTheme = EditorView.theme({
  "&": {
    minHeight: "620px",
    backgroundColor: "var(--bg-panel)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
    fontSize: "14px"
  },
  ".cm-scroller": {
    minHeight: "620px",
    fontFamily: "var(--font-mono)",
    lineHeight: "1.65"
  },
  ".cm-content": {
    padding: "28px 0",
    caretColor: "var(--accent-primary)"
  },
  ".cm-line": {
    padding: "0 28px"
  },
  ".cm-gutters": {
    borderRight: "1px solid var(--border-light)",
    backgroundColor: "var(--bg-subtle)",
    color: "var(--text-muted)"
  },
  ".cm-lineNumbers .cm-gutterElement": {
    minWidth: "44px",
    padding: "0 12px 0 10px"
  },
  ".cm-activeLine": {
    backgroundColor: "var(--bg-subtle)"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--accent-soft)",
    color: "var(--accent-primary)"
  },
  ".cm-selectionBackground": {
    backgroundColor: "color-mix(in srgb, var(--accent-primary) 24%, transparent) !important"
  },
  ".cm-cursor": {
    borderLeftColor: "var(--accent-primary)"
  },
  ".cm-matchingBracket, .cm-nonmatchingBracket": {
    backgroundColor: "var(--accent-soft)",
    color: "var(--text-primary)",
    outline: "1px solid var(--accent-primary)"
  },
  "&.cm-focused": {
    outline: "none"
  },
  "&.cm-focused .cm-scroller": {
    outline: "2px solid color-mix(in srgb, var(--accent-primary) 55%, white)",
    outlineOffset: "-2px"
  }
});

export const sourceHighlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.heading1, color: "var(--accent-primary)", fontWeight: "600" },
    { tag: tags.heading2, color: "var(--accent-hover)", fontWeight: "600" },
    { tag: tags.heading3, color: "var(--accent-hover)", fontWeight: "500" },
    { tag: tags.strong, color: "var(--text-primary)", fontWeight: "600" },
    { tag: tags.emphasis, color: "var(--text-secondary)", fontStyle: "italic" },
    { tag: tags.link, color: "var(--accent-primary)" },
    { tag: tags.url, color: "var(--success)" },
    { tag: tags.monospace, color: "var(--warning)", backgroundColor: "var(--code-bg)" },
    { tag: tags.quote, color: "var(--text-secondary)" },
    { tag: tags.list, color: "var(--accent-primary)" },
    { tag: tags.keyword, color: "var(--accent-hover)" },
    { tag: tags.string, color: "var(--success)" },
    { tag: tags.comment, color: "var(--text-muted)" }
  ])
);
