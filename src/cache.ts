import type { FetchedPage } from "./fetch.js";

export interface FetchCache {
  get(key: string): FetchedPage | undefined;
  set(key: string, value: FetchedPage): void;
  clear(): void;
}

interface Entry {
  value: FetchedPage;
  expiresAt: number;
}

export class MemoryCache implements FetchCache {
  private readonly map = new Map<string, Entry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(opts: { maxEntries?: number; ttlMs?: number } = {}) {
    this.maxEntries = opts.maxEntries ?? 200;
    this.ttlMs = opts.ttlMs ?? 5 * 60_000;
  }

  get(key: string): FetchedPage | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // refresh LRU order
    this.map.delete(key);
    this.map.set(key, e);
    return e.value;
  }

  set(key: string, value: FetchedPage): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  clear(): void {
    this.map.clear();
  }
}

let defaultCache: FetchCache | null = null;
export function getDefaultCache(): FetchCache {
  if (!defaultCache) defaultCache = new MemoryCache();
  return defaultCache;
}

export function cacheKey(url: string, useBrowser: boolean): string {
  return `${useBrowser ? "br" : "fp"}:${url}`;
}
