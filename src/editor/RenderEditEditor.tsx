import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { CrepeBuilder } from "@milkdown/crepe/builder";
import { blockEdit } from "@milkdown/crepe/feature/block-edit";
import { codeMirror } from "@milkdown/crepe/feature/code-mirror";
import { cursor } from "@milkdown/crepe/feature/cursor";
import { imageBlock } from "@milkdown/crepe/feature/image-block";
import { linkTooltip } from "@milkdown/crepe/feature/link-tooltip";
import { listItem } from "@milkdown/crepe/feature/list-item";
import { latex } from "@milkdown/crepe/feature/latex";
import { placeholder } from "@milkdown/crepe/feature/placeholder";
import { table } from "@milkdown/crepe/feature/table";
import { toolbar } from "@milkdown/crepe/feature/toolbar";
import { replaceAll } from "@milkdown/utils";
import { EmptyState } from "../components/EmptyState";
import "@milkdown/crepe/theme/common/prosemirror.css";
import "@milkdown/crepe/theme/common/reset.css";
import "@milkdown/crepe/theme/common/cursor.css";
import "@milkdown/crepe/theme/common/code-mirror.css";
import "@milkdown/crepe/theme/common/list-item.css";
import "@milkdown/crepe/theme/common/latex.css";
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
  const [hasInitializationError, setHasInitializationError] = useState(false);
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const crepeRef = useRef<CrepeBuilder | null>(null);
  const markdownRef = useRef(markdown);
  const renderedMarkdownRef = useRef<string | null>(null);
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
    let isReady = false;
    // StrictMode 重挂载或快速切换视图时，各实例只操作自己的挂载节点。
    const mount = document.createElement("div");
    editorHostRef.current.append(mount);
    const crepe = createCrepe(mount, markdownRef.current, (nextMarkdown) => {
      if (isDisposed || !isReady) {
        return;
      }

      if (isApplyingExternalRef.current) {
        return;
      }

      if (renderedMarkdownRef.current === nextMarkdown) {
        return;
      }

      renderedMarkdownRef.current = nextMarkdown;
      markdownRef.current = nextMarkdown;
      onChangeRef.current(nextMarkdown);
    });

    const creation = crepe.create();
    void creation.then(() => {
      if (isDisposed) {
        return;
      }

      crepeRef.current = crepe;
      syncCrepeMarkdown(crepe, markdownRef.current, null, isApplyingExternalRef);
      renderedMarkdownRef.current = crepe.getMarkdown();
      isReady = true;
    }).catch((error: unknown) => {
      if (!isDisposed) {
        crepeRef.current = null;
        console.error("双栏渲染编辑器初始化失败：", error);
        setHasInitializationError(true);
      }
    });

    return () => {
      isDisposed = true;
      isReady = false;
      crepeRef.current = null;
      mount.remove();
      isApplyingExternalRef.current = false;
      // 只在创建成功后销毁，避免 Milkdown 在创建失败后一直等待 OnCreate 状态结束。
      void creation.then(() => crepe.destroy(), () => undefined).catch((error: unknown) => {
        console.error("双栏渲染编辑器清理失败：", error);
      });
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
    // 记录编辑器规范化后的快照，插件的格式整理不应反向改写外部源码。
    renderedMarkdownRef.current = crepe.getMarkdown();
    markdownRef.current = markdown;
  }, [markdown]);

  return (
    <div className="render-edit-editor" aria-label="Markdown 渲染编辑器">
      {hasInitializationError && (
        <div role="alert">
          <EmptyState title="渲染编辑器加载失败" description="可继续在左侧编辑源码，或切换视图后重试。" />
        </div>
      )}
      <div ref={editorHostRef} hidden={hasInitializationError} />
    </div>
  );
}

function createCrepe(root: HTMLElement, defaultValue: string, onMarkdownUpdated: (markdown: string) => void) {
  const crepe = new CrepeBuilder({
    root,
    defaultValue
  })
    .addFeature(cursor)
    .addFeature(listItem)
    // LaTeX 块级公式依赖 Crepe 的 CodeMirror 代码块视图。
    .addFeature(codeMirror)
    .addFeature(latex)
    .addFeature(linkTooltip)
    .addFeature(imageBlock)
    .addFeature(blockEdit)
    .addFeature(placeholder)
    .addFeature(toolbar)
    .addFeature(table);

  crepe.on((listener) => {
    listener.markdownUpdated((_, nextMarkdown) => {
      // 忽略外部替换前尚未触发的旧文档回调，真实输入只按当前文档上抛。
      if (nextMarkdown === crepe.getMarkdown()) {
        onMarkdownUpdated(nextMarkdown);
      }
    });
  });

  return crepe;
}

function syncCrepeMarkdown(
  crepe: CrepeBuilder,
  markdown: string,
  scrollHost: HTMLElement | null,
  isApplyingExternalRef: MutableRefObject<boolean>
) {
  if (crepe.getMarkdown() === markdown) {
    return;
  }

  const scrollTop = scrollHost?.scrollTop ?? 0;

  isApplyingExternalRef.current = true;
  try {
    // flush=true 直接替换状态，不触发 markdownUpdated；无需延时屏蔽用户编辑。
    crepe.editor.action(replaceAll(markdown, true));
  } finally {
    isApplyingExternalRef.current = false;
  }
  window.requestAnimationFrame(() => {
    if (scrollHost) {
      scrollHost.scrollTop = scrollTop;
    }
  });
}

export default RenderEditEditor;
