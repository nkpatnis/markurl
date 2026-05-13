import { parseHTML } from "linkedom";
import { htmlToMarkdown } from "../normalize.js";
import { extractMetadata } from "../metadata.js";
import type { ArticleExtraction } from "./article.js";

export function extractGeneric(html: string, _baseUrl: string): ArticleExtraction {
  const { document } = parseHTML(html);
  const meta = extractMetadata(document as never);

  // Largest <p>-dense ancestor.
  let best: Element | null = null;
  let bestScore = 0;
  for (const candidate of document.querySelectorAll("article, main, section, div")) {
    const paras = candidate.querySelectorAll("p");
    const score = paras.length;
    if (score > bestScore) {
      best = candidate as unknown as Element;
      bestScore = score;
    }
  }

  const html2 = best?.innerHTML ?? document.body?.innerHTML ?? html;
  return {
    title: meta.title,
    byline: meta.byline,
    publishedAt: meta.publishedAt,
    siteName: meta.siteName,
    lang: meta.lang,
    excerpt: meta.excerpt,
    markdown: htmlToMarkdown(html2),
    images: [],
    links: [],
  };
}
