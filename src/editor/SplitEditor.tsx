import { RenderEditor } from "./RenderEditor";
import { SourceEditor } from "./SourceEditor";

interface SplitEditorProps {
  markdown: string;
  onChangeMarkdown: (markdown: string) => void;
}

export function SplitEditor({ markdown, onChangeMarkdown }: SplitEditorProps) {
  return (
    <div className="split-editor">
      <div className="split-pane">
        <SourceEditor markdown={markdown} onChangeMarkdown={onChangeMarkdown} />
      </div>
      <div className="split-pane split-preview">
        <RenderEditor markdown={markdown} />
      </div>
    </div>
  );
}
