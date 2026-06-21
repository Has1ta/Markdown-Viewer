interface SourceEditorProps {
  markdown: string;
  onChangeMarkdown: (markdown: string) => void;
}

export function SourceEditor({ markdown, onChangeMarkdown }: SourceEditorProps) {
  return (
    <textarea
      className="source-editor"
      value={markdown}
      spellCheck={false}
      aria-label="Markdown 源码编辑器"
      onChange={(event) => onChangeMarkdown(event.target.value)}
    />
  );
}
