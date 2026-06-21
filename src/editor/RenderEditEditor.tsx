import { useEffect, useRef, type MutableRefObject } from "react";
import { Crepe } from "@milkdown/crepe";
import { replaceAll } from "@milkdown/utils";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

interface RenderEditEditorProps {
  markdown: string;
  onChangeMarkdown: (markdown: string) => void;
}

export function RenderEditEditor({ markdown, onChangeMarkdown }: RenderEditEditorProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const markdownRef = useRef(markdown);
  const onChangeRef = useRef(onChangeMarkdown);
  const isApplyingExternalRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChangeMarkdown;
  }, [onChangeMarkdown]);

  useEffect(() => {
    if (!editorHostRef.current) {
      return;
    }

    let isDisposed = false;
    const crepe = createCrepe(editorHostRef.current, markdownRef.current, (nextMarkdown) => {
      if (isApplyingExternalRef.current || markdownRef.current === nextMarkdown) {
        return;
      }

      markdownRef.current = nextMarkdown;
      onChangeRef.current(nextMarkdown);
    });

    void crepe.create().then(() => {
      if (isDisposed) {
        void crepe.destroy();
        return;
      }

      crepeRef.current = crepe;
      syncCrepeMarkdown(crepe, markdownRef.current, null, isApplyingExternalRef);
    });

    return () => {
      isDisposed = true;
      crepeRef.current = null;
      void crepe.destroy();
    };
  }, []);

  useEffect(() => {
    const crepe = crepeRef.current;

    if (!crepe) {
      markdownRef.current = markdown;
      return;
    }

    if (markdownRef.current === markdown) {
      return;
    }

    const scrollHost = editorHostRef.current?.querySelector<HTMLElement>(".milkdown");
    syncCrepeMarkdown(crepe, markdown, scrollHost ?? null, isApplyingExternalRef);
    markdownRef.current = markdown;
  }, [markdown]);

  return <div className="render-edit-editor" ref={editorHostRef} aria-label="Markdown 渲染编辑器" />;
}

function createCrepe(root: HTMLElement, defaultValue: string, onMarkdownUpdated: (markdown: string) => void) {
  const crepe = new Crepe({
    root,
    defaultValue,
    features: {
      [Crepe.Feature.AI]: false,
      [Crepe.Feature.CodeMirror]: false,
      [Crepe.Feature.Latex]: false,
      [Crepe.Feature.TopBar]: false
    }
  });

  crepe.on((listener) => {
    listener.markdownUpdated((_, nextMarkdown) => {
      onMarkdownUpdated(nextMarkdown);
    });
  });

  return crepe;
}

function syncCrepeMarkdown(
  crepe: Crepe,
  markdown: string,
  scrollHost: HTMLElement | null,
  isApplyingExternalRef: MutableRefObject<boolean>
) {
  if (crepe.getMarkdown() === markdown) {
    return;
  }

  const scrollTop = scrollHost?.scrollTop ?? 0;

  isApplyingExternalRef.current = true;
  crepe.editor.action(replaceAll(markdown, true));
  window.queueMicrotask(() => {
    isApplyingExternalRef.current = false;
    if (scrollHost) {
      scrollHost.scrollTop = scrollTop;
    }
  });
}

export default RenderEditEditor;
