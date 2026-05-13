import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { htmlToMarkdown, stripTracking } from "../normalize.js";
import { extractMetadata } from "../metadata.js";

export interface ArticleExtraction {
  title: string | null;
  byline: string | null;
  publishedAt: string | null;
  siteName: string | null;
  lang: string | null;
  excerpt: string | null;
  markdown: string;
  images: Array<{ url: string; alt?: string }>;
  links: Array<{ url: string; text: string }>;
}

export function extractArticle(html: string, baseUrl: string): ArticleExtraction {
  const { document } = parseHTML(html);
  const meta = extractMetadata(document as never);

  // Readability mutates the document; clone via fresh parse.
  const { document: docForReadability } = parseHTML(html);
  const reader = new Readability(docForReadability as never, { charThreshold: 200 });
  const parsed = reader.parse();

  const contentHtml = parsed?.content ?? document.body?.innerHTML ?? "";
  const markdown = htmlToMarkdown(contentHtml);

  const { document: contentDoc } = parseHTML(`<div>${contentHtml}</div>`);
  const images: Array<{ url: string; alt?: string }> = [];
  for (const img of contentDoc.querySelectorAll("img")) {
    const src = img.getAttribute("src");
    if (!src) continue;
    try {
      images.push({
        url: new URL(src, baseUrl).toString(),
        alt: img.getAttribute("alt") ?? undefined,
      });
    } catch {
      // skip invalid
    }
  }

  const links: Array<{ url: string; text: string }> = [];
  for (const a of contentDoc.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    const text = (a.textContent ?? "").trim();
    if (!href || !text) continue;
    try {
      links.push({ url: stripTracking(new URL(href, baseUrl).toString()), text });
    } catch {
      // skip invalid
    }
  }

  return {
    title: parsed?.title ?? meta.title,
    byline: parsed?.byline ?? meta.byline,
    publishedAt: meta.publishedAt,
    siteName: meta.siteName ?? parsed?.siteName ?? null,
    lang: meta.lang ?? parsed?.lang ?? null,
    excerpt: parsed?.excerpt ?? meta.excerpt,
    markdown,
    images,
    links,
  };
}
