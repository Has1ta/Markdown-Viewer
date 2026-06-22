import { useEffect, useRef, type MutableRefObject } from "react";
import { CrepeBuilder } from "@milkdown/crepe/builder";
import { blockEdit } from "@milkdown/crepe/feature/block-edit";
import { cursor } from "@milkdown/crepe/feature/cursor";
import { imageBlock } from "@milkdown/crepe/feature/image-block";
import { linkTooltip } from "@milkdown/crepe/feature/link-tooltip";
import { listItem } from "@milkdown/crepe/feature/list-item";
import { placeholder } from "@milkdown/crepe/feature/placeholder";
import { table } from "@milkdown/crepe/feature/table";
import { toolbar } from "@milkdown/crepe/feature/toolbar";
import { replaceAll } from "@milkdown/utils";
import "@milkdown/crepe/theme/common/prosemirror.css";
import "@milkdown/crepe/theme/common/reset.css";
import "@milkdown/crepe/theme/common/cursor.css";
import "@milkdown/crepe/theme/common/list-item.css";
import "@milkdown/crepe/theme/common/link-tooltip.css";
import "@milkdown/crepe/theme/common/image-block.css";
import "@milkdown/crepe/theme/common/block-edit.css";
import "@milkdown/crepe/theme/common/placeholder.css";
import "@milkdown/crepe/theme/common/toolbar.css";
import "@milkdown/crepe/theme/common/table.css";
import "@milkdown/crepe/theme/frame.css";

interface RenderEditEditorProps {
  markdown: string;
  onChangeMarkdown: (markdown: string) => void;
}

export function RenderEditEditor({ markdown, onChangeMarkdown }: RenderEditEditorProps) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const crepeRef = useRef<CrepeBuilder | null>(null);
  const markdownRef = useRef(markdown);
  const onChangeRef = useRef(onChangeMarkdown);
  const isApplyingExternalRef = useRef(false);
  const externalSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onChangeRef.current = onChangeMarkdown;
  }, [onChangeMarkdown]);

  useEffect(() => {
    if (!editorHostRef.current) {
      return;
    }

    let isDisposed = false;
    const crepe = createCrepe(editorHostRef.current, markdownRef.current, (nextMarkdown) => {
      if (isApplyingExternalRef.current) {
        markdownRef.current = nextMarkdown;
        return;
      }

      if (markdownRef.current === nextMarkdown) {
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
      syncCrepeMarkdown(crepe, markdownRef.current, null, isApplyingExternalRef, externalSyncTimerRef);
    });

    return () => {
      isDisposed = true;
      crepeRef.current = null;
      if (externalSyncTimerRef.current !== null) {
        window.clearTimeout(externalSyncTimerRef.current);
        externalSyncTimerRef.current = null;
      }
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
    syncCrepeMarkdown(crepe, markdown, scrollHost ?? null, isApplyingExternalRef, externalSyncTimerRef);
    markdownRef.current = markdown;
  }, [markdown]);

  return <div className="render-edit-editor" ref={editorHostRef} aria-label="Markdown 渲染编辑器" />;
}

function createCrepe(root: HTMLElement, defaultValue: string, onMarkdownUpdated: (markdown: string) => void) {
  const crepe = new CrepeBuilder({
    root,
    defaultValue
  })
    .addFeature(cursor)
    .addFeature(listItem)
    .addFeature(linkTooltip)
    .addFeature(imageBlock)
    .addFeature(blockEdit)
    .addFeature(placeholder)
    .addFeature(toolbar)
    .addFeature(table);

  crepe.on((listener) => {
    listener.markdownUpdated((_, nextMarkdown) => {
      onMarkdownUpdated(nextMarkdown);
    });
  });

  return crepe;
}

function syncCrepeMarkdown(
  crepe: CrepeBuilder,
  markdown: string,
  scrollHost: HTMLElement | null,
  isApplyingExternalRef: MutableRefObject<boolean>,
  externalSyncTimerRef: MutableRefObject<number | null>
) {
  if (crepe.getMarkdown() === markdown) {
    return;
  }

  const scrollTop = scrollHost?.scrollTop ?? 0;

  if (externalSyncTimerRef.current !== null) {
    window.clearTimeout(externalSyncTimerRef.current);
    externalSyncTimerRef.current = null;
  }

  isApplyingExternalRef.current = true;
  crepe.editor.action(replaceAll(markdown, true));
  window.requestAnimationFrame(() => {
    if (scrollHost) {
      scrollHost.scrollTop = scrollTop;
    }
  });
  externalSyncTimerRef.current = window.setTimeout(() => {
    isApplyingExternalRef.current = false;
    externalSyncTimerRef.current = null;
  }, 250);
}

export default RenderEditEditor;
