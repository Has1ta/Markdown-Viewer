import { useEffect, useMemo, useState, type MouseEvent, type FormEvent } from "react";
import DOMPurify from "dompurify";
import { Marked } from "marked";
import type { RendererThis, Tokens } from "marked";
import { EmptyState } from "../components/EmptyState";
import { cleanHeadingText } from "../markdown/heading-text";
import { slugifyHeading } from "../markdown/slug";

interface RenderEditorProps {
  markdown: string;
  filePath?: string | null;
  isLoading?: boolean;
  onChangeMarkdown?: (markdown: string) => void;
}

const supportedLanguages = [
  { label: "Plain Text", value: "" },
  { label: "Markdown", value: "markdown" },
  { label: "JSON", value: "json" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "Bash", value: "bash" },
  { label: "Python", value: "python" },
  { label: "SQL", value: "sql" }
];

export function RenderEditor({ markdown, filePath = null, isLoading = false, onChangeMarkdown }: RenderEditorProps) {
  const [assetUrlMap, setAssetUrlMap] = useState<Record<string, string | null>>({});
  const [codeStatusMessage, setCodeStatusMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;
    const relativeImageSources = collectRelativeImageSources(markdown);

    if (!filePath || relativeImageSources.length === 0 || !window.markdownViewer?.resolveAssetUrl) {
      setAssetUrlMap({});
      return;
    }

    void Promise.all(
      relativeImageSources.map(async (assetPath) => {
        const resolvedUrl = await window.markdownViewer?.resolveAssetUrl({ documentPath: filePath, assetPath });
        return [assetPath, resolvedUrl ?? null] as const;
      })
    ).then((entries) => {
      if (!isCancelled) {
        setAssetUrlMap(Object.fromEntries(entries));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [filePath, markdown]);

  const html = useMemo(() => {
    const rawHtml = renderMarkdown(markdown, assetUrlMap);
    return DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: [
        "aria-expanded",
        "aria-label",
        "data-code-block-index",
        "data-code-fence-index",
        "data-language",
        "data-language-value",
        "data-original-src",
        "hidden",
        "loading",
        "rel",
        "role",
        "target",
        "type"
      ]
    });
  }, [assetUrlMap, markdown]);

  async function handleMarkdownClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const copyButton = target.closest<HTMLButtonElement>("[data-code-action='copy']");
    if (copyButton) {
      await copyCodeBlock(copyButton);
      return;
    }

    const previewButton = target.closest<HTMLButtonElement>("[data-code-action='preview']");
    if (previewButton) {
      toggleCodePreview(previewButton);
      return;
    }

    const languageButton = target.closest<HTMLButtonElement>("[data-code-action='language']");
    if (languageButton) {
      toggleLanguagePicker(languageButton);
      return;
    }

    const languageOption = target.closest<HTMLButtonElement>("[data-code-language]");
    if (languageOption) {
      chooseCodeLanguage(languageOption);
    }
  }

  function handleMarkdownInput(event: FormEvent<HTMLElement>) {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || !target.matches("[data-language-search]")) {
      return;
    }

    const picker = target.closest<HTMLElement>(".language-picker");
    const query = target.value.trim().toLowerCase();
    picker?.querySelectorAll<HTMLElement>("[data-code-language]").forEach((option) => {
      option.hidden = query.length > 0 && !option.textContent?.toLowerCase().includes(query);
    });
  }

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

  return (
    <>
      <article
        className="markdown-body"
        onClick={handleMarkdownClick}
        onInput={handleMarkdownInput}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div className="visually-hidden" role="status" aria-live="polite">
        {codeStatusMessage}
      </div>
    </>
  );

  async function copyCodeBlock(copyButton: HTMLButtonElement) {
    const codeBlock = copyButton.closest<HTMLElement>(".code-block");
    const code = codeBlock?.querySelector("code")?.textContent ?? "";

    if (!code) {
      setCodeStatusMessage("没有可复制的代码。");
      return;
    }

    await navigator.clipboard.writeText(code);
    copyButton.textContent = "已复制";
    setCodeStatusMessage("代码已复制。");
    window.setTimeout(() => {
      copyButton.textContent = "复制";
    }, 1400);
  }

  function toggleCodePreview(previewButton: HTMLButtonElement) {
    const codeBlock = previewButton.closest<HTMLElement>(".code-block");
    const isCollapsed = codeBlock?.classList.toggle("is-code-collapsed") ?? false;
    previewButton.textContent = isCollapsed ? "显示代码" : "隐藏代码";
    previewButton.setAttribute("aria-expanded", String(!isCollapsed));
  }

  function toggleLanguagePicker(languageButton: HTMLButtonElement) {
    const codeBlock = languageButton.closest<HTMLElement>(".code-block");
    const picker = codeBlock?.querySelector<HTMLElement>(".language-picker");

    if (!picker) {
      return;
    }

    const shouldOpen = picker.hidden;
    closeLanguagePickers();
    picker.hidden = !shouldOpen;
    languageButton.setAttribute("aria-expanded", String(shouldOpen));

    if (shouldOpen) {
      picker.querySelector<HTMLInputElement>("[data-language-search]")?.focus();
    }
  }

  function chooseCodeLanguage(languageOption: HTMLButtonElement) {
    const codeBlock = languageOption.closest<HTMLElement>(".code-block");
    const languageButton = codeBlock?.querySelector<HTMLButtonElement>("[data-code-action='language']");
    const picker = codeBlock?.querySelector<HTMLElement>(".language-picker");
    const codeFenceIndex = Number(codeBlock?.dataset.codeFenceIndex ?? -1);
    const nextLanguage = languageOption.dataset.codeLanguage ?? "";
    const nextLanguageLabel = languageOption.textContent?.trim() || "Plain Text";

    if (codeBlock) {
      codeBlock.dataset.language = nextLanguageLabel;
    }

    if (languageButton) {
      languageButton.textContent = nextLanguageLabel;
      languageButton.setAttribute("aria-expanded", "false");
    }

    if (picker) {
      picker.hidden = true;
    }

    if (codeFenceIndex >= 0 && onChangeMarkdown) {
      const nextMarkdown = updateFencedCodeLanguage(markdown, codeFenceIndex, nextLanguage);

      if (nextMarkdown !== markdown) {
        onChangeMarkdown(nextMarkdown);
      }
    }
  }
}

function closeLanguagePickers() {
  document.querySelectorAll<HTMLElement>(".language-picker").forEach((picker) => {
    picker.hidden = true;
  });

  document.querySelectorAll<HTMLButtonElement>("[data-code-action='language']").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
  });
}

function renderMarkdown(markdown: string, assetUrlMap: Record<string, string | null>) {
  const usedIds = new Map<string, number>();
  let codeBlockIndex = 0;
  let fencedCodeBlockIndex = 0;
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
        const languageValue = normalizeLanguageValue(token.lang);
        const language = getLanguageLabel(languageValue);
        const code = escapeHtml(token.text);
        const blockIndex = codeBlockIndex;
        const isFencedCode = isFencedCodeToken(token);
        const fenceIndex = isFencedCode ? fencedCodeBlockIndex : -1;
        codeBlockIndex += 1;

        if (isFencedCode) {
          fencedCodeBlockIndex += 1;
        }

        return `<figure class="code-block" data-code-block-index="${blockIndex}" data-code-fence-index="${fenceIndex}" data-language="${escapeAttribute(
          language
        )}"><figcaption class="code-block-toolbar"><button class="code-language-button" type="button" data-code-action="language" aria-expanded="false">${escapeHtml(
          language
        )}</button><div class="code-block-actions"><button type="button" data-code-action="preview" aria-expanded="true">隐藏代码</button><button type="button" data-code-action="copy">复制</button></div></figcaption>${renderLanguagePicker()}<pre><code>${code}</code></pre></figure>`;
      },
      link(this: RendererThis, token: Tokens.Link) {
        const text = this.parser.parseInline(token.tokens) as string;
        const title = token.title ? ` title="${escapeAttribute(token.title)}"` : "";
        const externalAttrs = /^https?:\/\//i.test(token.href) ? ' target="_blank" rel="noreferrer"' : "";

        return `<a href="${escapeAttribute(token.href)}"${title}${externalAttrs}>${text}</a>`;
      },
      image(token: Tokens.Image) {
        const title = token.title ? ` title="${escapeAttribute(token.title)}"` : "";
        const altText = token.text || "Markdown 图片";
        const caption = token.text ? `<figcaption>${escapeHtml(token.text)}</figcaption>` : "";
        const resolvedSrc = resolveImageSource(token.href, assetUrlMap);

        if (resolvedSrc === null) {
          return `<figure class="markdown-image is-missing" data-original-src="${escapeAttribute(
            token.href
          )}"><div class="missing-image-placeholder" role="img" aria-label="${escapeAttribute(
            altText
          )}"><strong>图片无法显示</strong><span>${escapeHtml(token.href)}</span></div>${caption}</figure>`;
        }

        return `<figure class="markdown-image" data-original-src="${escapeAttribute(token.href)}"><img src="${escapeAttribute(
          resolvedSrc
        )}" alt="${escapeAttribute(altText)}"${title} loading="lazy" />${caption}</figure>`;
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

function renderLanguagePicker() {
  const options = supportedLanguages
    .map(
      (language) =>
        `<button type="button" data-code-language="${escapeAttribute(language.value)}">${escapeHtml(language.label)}</button>`
    )
    .join("");

  return `<div class="language-picker" hidden><input type="search" data-language-search aria-label="搜索代码语言" placeholder="搜索语言" /><div class="language-options">${options}</div></div>`;
}

function normalizeLanguageValue(language: string | undefined) {
  const trimmedLanguage = language?.trim().toLowerCase() ?? "";

  if (["js", "jsx"].includes(trimmedLanguage)) {
    return "javascript";
  }

  if (["ts", "tsx"].includes(trimmedLanguage)) {
    return "typescript";
  }

  if (["sh", "shell", "zsh", "powershell", "ps1"].includes(trimmedLanguage)) {
    return "bash";
  }

  if (["py"].includes(trimmedLanguage)) {
    return "python";
  }

  if (["md"].includes(trimmedLanguage)) {
    return "markdown";
  }

  return trimmedLanguage;
}

function getLanguageLabel(languageValue: string) {
  return supportedLanguages.find((language) => language.value === languageValue)?.label ?? (languageValue || "Plain Text");
}

function isFencedCodeToken(token: Tokens.Code) {
  return /^(```|~~~)/.test(token.raw ?? "");
}

function updateFencedCodeLanguage(markdown: string, targetFenceIndex: number, nextLanguage: string) {
  const fencePattern = /(^|\n)(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n\2(?=\n|$)/g;
  let fenceIndex = 0;

  return markdown.replace(fencePattern, (match, lineStart: string, fence: string, _info: string, body: string) => {
    if (fenceIndex !== targetFenceIndex) {
      fenceIndex += 1;
      return match;
    }

    fenceIndex += 1;
    const languageInfo = nextLanguage ? nextLanguage : "";
    return `${lineStart}${fence}${languageInfo}\n${body}\n${fence}`;
  });
}

function collectRelativeImageSources(markdown: string) {
  const imageSourcePattern = /!\[[^\]]*]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
  const imageSources = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = imageSourcePattern.exec(markdown)) !== null) {
    const imageSource = match[1];

    if (isRelativeImagePath(imageSource)) {
      imageSources.add(imageSource);
    }
  }

  return Array.from(imageSources);
}

function resolveImageSource(imageSource: string, assetUrlMap: Record<string, string | null>) {
  if (!isRelativeImagePath(imageSource)) {
    return imageSource;
  }

  return Object.prototype.hasOwnProperty.call(assetUrlMap, imageSource) ? assetUrlMap[imageSource] : null;
}

function isRelativeImagePath(imageSource: string) {
  return !/^(https?:|file:|blob:|data:|\/|#)/i.test(imageSource);
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
