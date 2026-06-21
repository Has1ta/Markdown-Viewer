import { useMemo } from "react";
import DOMPurify from "dompurify";
import { Marked } from "marked";
import type { RendererThis, Tokens } from "marked";
import { cleanHeadingText } from "../markdown/heading-text";
import { slugifyHeading } from "../markdown/slug";

interface RenderEditorProps {
  markdown: string;
}

export function RenderEditor({ markdown }: RenderEditorProps) {
  const html = useMemo(() => {
    const rawHtml = renderMarkdown(markdown);
    return DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ["target", "rel"]
    });
  }, [markdown]);

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

        return `<h${token.depth} id="${id}">${inlineHtml}</h${token.depth}>`;
      }
    }
  });

  return parser.parse(markdown, { async: false }) as string;
}
