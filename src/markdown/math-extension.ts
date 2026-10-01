import katex from "katex";
import type { MarkedExtension, Tokens } from "marked";

export function markedBracketMath(): MarkedExtension {
  return {
    extensions: [
      {
        name: "bracketDisplayMath",
        level: "block",
        start(source) {
          const match = /(?:^|\n)[ \t]*\\\[/.exec(source);
          return match ? match.index + match[0].lastIndexOf("\\[") : undefined;
        },
        tokenizer(source) {
          const match = /^\\\[([\s\S]+?)\\\][ \t]*(?:\n|$)/.exec(source);
          if (!match) return undefined;

          return {
            type: "bracketDisplayMath",
            raw: match[0],
            text: match[1].trim(),
            displayMode: true
          } as Tokens.Generic;
        },
        renderer(token) {
          return katex.renderToString(token.text, { throwOnError: false, displayMode: true }) + "\n";
        }
      },
      {
        name: "bracketInlineMath",
        level: "inline",
        start(source) {
          const index = source.indexOf("\\(");
          return index < 0 ? undefined : index;
        },
        tokenizer(source) {
          const match = /^\\\(([\s\S]+?)\\\)/.exec(source);
          if (!match) return undefined;

          return {
            type: "bracketInlineMath",
            raw: match[0],
            text: match[1].trim(),
            displayMode: false
          } as Tokens.Generic;
        },
        renderer(token) {
          return katex.renderToString(token.text, { throwOnError: false, displayMode: false });
        }
      }
    ]
  };
}
