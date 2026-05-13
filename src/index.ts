import { fetchPage } from "./fetch.js";
import { routeUrl, type ContentType } from "./router.js";
import { extractArticle, type ArticleExtraction } from "./extractors/article.js";
import { extractGithub } from "./extractors/github.js";
import { extractGeneric } from "./extractors/generic.js";
import { countTokens, trimToTokenBudget } from "./budget.js";
import { fetchPageWithBrowser } from "./browser.js";
import { cacheKey, getDefaultCache } from "./cache.js";
import type { FetchedPage } from "./fetch.js";
import {
  ExtractOptionsSchema,
  ExtractResultSchema,
  type ExtractOptions,
  type ExtractResult,
} from "./types.js";

export {
  ExtractOptionsSchema,
  ExtractResultSchema,
  type ExtractOptions,
  type ExtractResult,
} from "./types.js";
export { MemoryCache, getDefaultCache, type FetchCache } from "./cache.js";
export { HostRateLimiter, getDefaultLimiter, type RateLimiter } from "./ratelimit.js";
export { shutdownBrowser } from "./browser.js";

const DEFAULT_MAX_TOKENS = 8000;

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function assemble(
  url: string,
  finalUrl: string,
  contentType: ContentType,
  raw: ArticleExtraction,
  maxTokens: number,
  includeImages: boolean,
  includeLinks: boolean,
): ExtractResult {
  const { text, truncated } = trimToTokenBudget(raw.markdown, maxTokens);
  return {
    url,
    finalUrl,
    contentType,
    title: raw.title,
    byline: raw.byline,
    publishedAt: raw.publishedAt,
    siteName: raw.siteName,
    lang: raw.lang,
    excerpt: raw.excerpt,
    markdown: text,
    wordCount: wordCount(text),
    tokenCount: countTokens(text),
    truncated,
    images: includeImages ? raw.images : [],
    links: includeLinks ? raw.links : [],
  };
}

function looksJsHeavy(html: string): boolean {
  // Tiny body + presence of an app-mount root is the classic SPA signature.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch?.[1] ?? html;
  const stripped = body.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, "").trim();
  if (stripped.length > 500) return false;
  return /<div[^>]+id=["'](root|app|__next|__nuxt)["']/i.test(html);
}

export async function extract(
  url: string,
  options: ExtractOptions = {},
): Promise<ExtractResult> {
  const opts = ExtractOptionsSchema.parse(options);
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  const includeImages = opts.includeImages ?? true;
  const includeLinks = opts.includeLinks ?? false;
  const useBrowser = opts.useBrowser ?? "never";

  const contentType = routeUrl(url);

  if (contentType === "github") {
    const raw = await extractGithub(url, {
      userAgent: opts.userAgent,
      timeoutMs: opts.timeoutMs,
    });
    return assemble(url, url, "github", raw, maxTokens, includeImages, includeLinks);
  }

  const fetchOnce = (): Promise<FetchedPage> =>
    fetchPage(url, {
      userAgent: opts.userAgent,
      timeoutMs: opts.timeoutMs,
      followRedirects: opts.followRedirects,
    });

  let page: FetchedPage;
  if (useBrowser === "always") {
    page = await fetchPageWithBrowser(url, {
      timeoutMs: opts.timeoutMs,
      userAgent: opts.userAgent,
    });
    const cache = getDefaultCache();
    cache.set(cacheKey(url, true), page);
  } else {
    page = await fetchOnce();
    if (page.status >= 400) {
      throw new Error(`fetch failed: HTTP ${page.status} for ${url}`);
    }
    if (useBrowser === "auto" && looksJsHeavy(page.body)) {
      page = await fetchPageWithBrowser(url, {
        timeoutMs: opts.timeoutMs,
        userAgent: opts.userAgent,
      });
      const cache = getDefaultCache();
      cache.set(cacheKey(url, true), page);
    }
  }

  const isHtml = /html|xml/i.test(page.contentType);
  if (!isHtml) {
    return assemble(
      url,
      page.finalUrl,
      "generic",
      {
        title: null,
        byline: null,
        publishedAt: null,
        siteName: null,
        lang: null,
        excerpt: null,
        markdown: page.body,
        images: [],
        links: [],
      },
      maxTokens,
      includeImages,
      includeLinks,
    );
  }

  const raw = extractArticle(page.body, page.finalUrl);
  if (!raw.markdown || raw.markdown.length < 100) {
    const fallback = extractGeneric(page.body, page.finalUrl);
    return assemble(url, page.finalUrl, "generic", fallback, maxTokens, includeImages, includeLinks);
  }
  return assemble(url, page.finalUrl, "article", raw, maxTokens, includeImages, includeLinks);
}

export function extractFromHtml(
  html: string,
  baseUrl: string,
  options: ExtractOptions = {},
): ExtractResult {
  const opts = ExtractOptionsSchema.parse(options);
  const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
  const raw = extractArticle(html, baseUrl);
  return assemble(
    baseUrl,
    baseUrl,
    "article",
    raw,
    maxTokens,
    opts.includeImages ?? true,
    opts.includeLinks ?? false,
  );
}
