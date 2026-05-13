import { request } from "undici";
import { cacheKey, getDefaultCache, type FetchCache } from "./cache.js";
import { getDefaultLimiter, hostOf, type RateLimiter } from "./ratelimit.js";

const DEFAULT_UA =
  "web-extract/0.1 (+https://github.com/) compatible AI-agent extractor";

export interface FetchedPage {
  finalUrl: string;
  status: number;
  contentType: string;
  body: string;
}

export interface FetchOptions {
  userAgent?: string;
  timeoutMs?: number;
  followRedirects?: boolean;
  cache?: FetchCache | false;
  rateLimiter?: RateLimiter | false;
}

export async function fetchPage(
  url: string,
  opts: FetchOptions = {},
): Promise<FetchedPage> {
  const {
    userAgent = DEFAULT_UA,
    timeoutMs = 15_000,
    followRedirects = true,
  } = opts;

  const cache =
    opts.cache === false ? null : opts.cache ?? getDefaultCache();
  const limiter =
    opts.rateLimiter === false ? null : opts.rateLimiter ?? getDefaultLimiter();

  if (cache) {
    const hit = cache.get(cacheKey(url, false));
    if (hit) return hit;
  }

  if (limiter) await limiter.acquire(hostOf(url));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await request(url, {
      method: "GET",
      maxRedirections: followRedirects ? 5 : 0,
      headers: {
        "user-agent": userAgent,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
        "accept-language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });

    const contentType = String(res.headers["content-type"] ?? "");
    const body = await res.body.text();
    const finalUrl =
      (res.context as { history?: URL[] })?.history?.at(-1)?.toString() ?? url;

    const page: FetchedPage = { finalUrl, status: res.statusCode, contentType, body };
    if (cache && res.statusCode < 400) cache.set(cacheKey(url, false), page);
    return page;
  } finally {
    clearTimeout(timer);
  }
}
