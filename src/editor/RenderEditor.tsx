import { useMemo } from "react";
import DOMPurify from "dompurify";
import { Marked } from "marked";
import type { RendererThis, Tokens } from "marked";
import { EmptyState } from "../components/EmptyState";
import { cleanHeadingText } from "../markdown/heading-text";
import { slugifyHeading } from "../markdown/slug";

interface RenderEditorProps {
  markdown: string;
  isLoading?: boolean;
}

export function RenderEditor({ markdown, isLoading = false }: RenderEditorProps) {
  const html = useMemo(() => {
    const rawHtml = renderMarkdown(markdown);
    return DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ["target", "rel", "loading", "data-language"]
    });
  }, [markdown]);

  if (isLoading) {
    return (
      <div className="markdown-body markdown-loading" aria-label="文档加载中">
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (markdown.trim().length === 0) {
    return <EmptyState title="还没有内容" description="打开 Markdown 文件或在源码视图输入内容后，渲染视图会显示排版结果。" />;
  }

  return <article className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}

function renderMarkdown(markdown: string) {
  const usedIds = new Map<string, number>();
  const parser = new Marked({
    gfm: true,
    breaks: false,
    renderer: {
      heading(this: RendererThis, token: Tokens.Heading) {
        const inlineHtml = this.parser.parseInline(token.tokens) as string;

        if (token.depth > 3) {
          return `<h${token.depth}>${inlineHtml}</h${token.depth}>`;
        }

        const text = cleanHeadingText(token.text);
        const baseId = slugifyHeading(text) || `heading-${usedIds.size + 1}`;
        const count = usedIds.get(baseId) ?? 0;
        usedIds.set(baseId, count + 1);
        const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

        return `<h${token.depth} id="${escapeAttribute(id)}">${inlineHtml}</h${token.depth}>`;
      },
      paragraph(this: RendererThis, token: Tokens.Paragraph) {
        if (token.tokens.length === 1 && token.tokens[0].type === "image") {
          return this.parser.parseInline(token.tokens) as string;
        }

        return `<p>${this.parser.parseInline(token.tokens) as string}</p>`;
      },
      code(token: Tokens.Code) {
        const language = normalizeLanguage(token.lang);
        const code = escapeHtml(token.text);

        return `<figure class="code-block" data-language="${escapeAttribute(language)}"><figcaption>${escapeHtml(
          language
        )}</figcaption><pre><code>${code}</code></pre></figure>`;
      },
      link(this: RendererThis, token: Tokens.Link) {
        const text = this.parser.parseInline(token.tokens) as string;
        const title = token.title ? ` title="${escapeAttribute(token.title)}"` : "";
        const externalAttrs = /^https?:\/\//i.test(token.href) ? ' target="_blank" rel="noreferrer"' : "";

        return `<a href="${escapeAttribute(token.href)}"${title}${externalAttrs}>${text}</a>`;
      },
      image(token: Tokens.Image) {
        const title = token.title ? ` title="${escapeAttribute(token.title)}"` : "";
        const caption = token.text ? `<figcaption>${escapeHtml(token.text)}</figcaption>` : "";

        return `<figure class="markdown-image"><img src="${escapeAttribute(token.href)}" alt="${escapeAttribute(
          token.text
        )}"${title} loading="lazy" />${caption}</figure>`;
      },
      table(this: RendererThis, token: Tokens.Table) {
        const header = token.header.map((cell) => renderTableCell(this, cell, "th")).join("");
        const rows = token.rows
          .map((row) => `<tr>${row.map((cell) => renderTableCell(this, cell, "td")).join("")}</tr>`)
          .join("");

        return `<div class="markdown-table-scroll"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
      }
    }
  });

  return parser.parse(markdown, { async: false }) as string;
}

function renderTableCell(renderer: RendererThis, cell: Tokens.TableCell, tagName: "th" | "td") {
  const alignClass = cell.align ? ` class="align-${cell.align}"` : "";
  const content = renderer.parser.parseInline(cell.tokens) as string;
  return `<${tagName}${alignClass}>${content}</${tagName}>`;
}

function normalizeLanguage(language: string | undefined) {
  return language?.trim() || "Plain Text";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
