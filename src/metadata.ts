type Doc = {
  querySelector: (sel: string) => { getAttribute: (a: string) => string | null; textContent: string | null } | null;
  querySelectorAll: (sel: string) => Array<{ getAttribute: (a: string) => string | null; textContent: string | null }>;
};

export interface PageMetadata {
  title: string | null;
  byline: string | null;
  publishedAt: string | null;
  siteName: string | null;
  lang: string | null;
  excerpt: string | null;
}

function meta(doc: Doc, selectors: string[]): string | null {
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    const v = el?.getAttribute("content") ?? el?.textContent ?? null;
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function fromJsonLd(doc: Doc): Partial<PageMetadata> {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    const raw = s.textContent;
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data) ? data : [data];
      for (const n of nodes) {
        if (!n || typeof n !== "object") continue;
        const t = n["@type"];
        const types = Array.isArray(t) ? t : [t];
        if (types.some((x) => typeof x === "string" && /Article|BlogPosting|NewsArticle/i.test(x))) {
          return {
            title: n.headline ?? null,
            byline: typeof n.author === "string" ? n.author : n.author?.name ?? null,
            publishedAt: n.datePublished ?? null,
            excerpt: n.description ?? null,
          };
        }
      }
    } catch {
      // ignore malformed ld+json
    }
  }
  return {};
}

export function extractMetadata(doc: Doc): PageMetadata {
  const ld = fromJsonLd(doc);

  const html = doc.querySelector("html");
  const lang = html?.getAttribute("lang") ?? null;

  return {
    title:
      ld.title ??
      meta(doc, [
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        "title",
      ]),
    byline:
      ld.byline ??
      meta(doc, [
        'meta[name="author"]',
        'meta[property="article:author"]',
        'meta[name="twitter:creator"]',
      ]),
    publishedAt:
      ld.publishedAt ??
      meta(doc, [
        'meta[property="article:published_time"]',
        'meta[name="date"]',
        'meta[name="pubdate"]',
        "time[datetime]",
      ]),
    siteName: meta(doc, [
      'meta[property="og:site_name"]',
      'meta[name="application-name"]',
    ]),
    lang,
    excerpt:
      ld.excerpt ??
      meta(doc, [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
      ]),
  };
}
