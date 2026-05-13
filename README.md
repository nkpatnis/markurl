[![MCPScore](https://timeahead.in/api/v1/mcp/badge/markurl.svg)](https://timeahead.in/mcp/markurl)
[![Socket Badge](https://badge.socket.dev/npm/package/markurl/0.1.0)](https://badge.socket.dev/npm/package/markurl/0.1.0)
# markurl

URL in → clean Markdown + structured metadata out. Built for AI agent tool use.

`markurl` is a small Node library that fetches a web page and returns a token-budgeted, deterministic representation suitable for stuffing into an LLM context window. Ships with an MCP server so it's usable as a tool from Claude Desktop, Claude Code, or any MCP client without writing glue code.

## Why not just Readability / defuddle?

- **Token-aware.** Callers give a budget; the library trims at section boundaries (and falls back to a prorated cut) so output fits without post-processing.
- **Agent-shaped output.** Stable JSON schema (Zod-validated), normalized metadata, tracking-param-stripped links.
- **Metadata fusion.** Merges JSON-LD `Article`/`NewsArticle`/`BlogPosting`, OpenGraph, Twitter cards, and `<meta>` tags into one normalized object.
- **Content-type routing.** GitHub repos return the raw README via `raw.githubusercontent.com` instead of scraping the rendered page chrome.

## Install

```bash
npm install markurl
```

Requires Node 20+.

## Library usage

```ts
import { extract } from "markurl";

const result = await extract("https://example.com/article", {
  maxTokens: 4000,
  includeLinks: true,
});

console.log(result.title);
console.log(result.markdown);
console.log(result.tokenCount, result.truncated);
```

### `extract(url, options?)`

| Option            | Type      | Default   | Description                                        |
| ----------------- | --------- | --------- | -------------------------------------------------- |
| `maxTokens`       | `number`  | `8000`    | Trim markdown to fit this budget.                  |
| `userAgent`       | `string`  | built-in  | Override the request UA.                           |
| `timeoutMs`       | `number`  | `15000`   | Per-request timeout.                               |
| `followRedirects` | `boolean` | `true`    | Follow up to 5 redirects.                          |
| `includeImages`   | `boolean` | `true`    | Include extracted `<img>` URLs and alts.           |
| `includeLinks`    | `boolean` | `false`   | Include extracted links (tracking params stripped).|
| `useBrowser`      | `"never" \| "auto" \| "always"` | `"never"` | Use headless Playwright. `auto` falls back when the static fetch looks JS-rendered. Requires the optional `playwright` peer dep. |

### `extractFromHtml(html, baseUrl, options?)`

Skip the fetch — useful when an agent has already loaded the page (e.g. via a browser tool).

### Result shape

```ts
type ExtractResult = {
  url: string;
  finalUrl: string;
  contentType: "article" | "github" | "generic";
  title: string | null;
  byline: string | null;
  publishedAt: string | null;
  siteName: string | null;
  lang: string | null;
  excerpt: string | null;
  markdown: string;
  wordCount: number;
  tokenCount: number;
  truncated: boolean;
  images: { url: string; alt?: string }[];
  links: { url: string; text: string }[];
};
```

The Zod schema is exported as `ExtractResultSchema` if you want to validate at the call site.

## MCP server

Exposes a single tool, `extract`, with the same options as the library. Wire it into Claude Desktop via `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "markurl": {
      "command": "npx",
      "args": ["-y", "markurl"]
    }
  }
}
```

## Architecture

```
fetch (undici) → router → extractor → normalize → budget → ExtractResult
```

- **Router** ([src/router.ts](src/router.ts)) picks an extractor from the URL.
- **Extractors** ([src/extractors/](src/extractors/)) — `article` uses Mozilla Readability + linkedom; `github` fetches the raw README; `generic` is a `<p>`-density fallback.
- **Normalizer** ([src/normalize.ts](src/normalize.ts)) — Turndown for HTML → Markdown, plus a tracking-parameter stripper.
- **Budgeter** ([src/budget.ts](src/budget.ts)) — `gpt-tokenizer` for counting, section-aware trim.
- **Metadata** ([src/metadata.ts](src/metadata.ts)) — JSON-LD + OG + Twitter + `<meta>` fusion.

## v1 scope (what's in this release)

- HTML article extraction (Readability + linkedom)
- GitHub repo README extraction
- Generic `<p>`-density fallback
- Token budgeting with section-aware trim
- Tracking parameter stripping
- In-memory LRU+TTL fetch cache (pluggable via `FetchCache`)
- Per-host rate limiting (default 500 ms min interval; pluggable)
- Optional Playwright fallback for JS-heavy sites (`useBrowser: "auto" | "always"`)
- MCP stdio server

### Caching

Fetched HTML is cached by URL with a default 5-minute TTL and 200-entry cap. Swap in your own store:

```ts
import { extract, type FetchCache } from "markurl";

const redisCache: FetchCache = {
  get(key) { /* ... */ },
  set(key, value) { /* ... */ },
  clear() { /* ... */ },
};
// Pass via lower-level fetchPage, or set the module-default by calling new MemoryCache() yourself.
```

### Rate limiting

A `HostRateLimiter` ensures at least N ms between requests to the same host (default 500 ms). Distinct hosts run in parallel.

### Playwright fallback

Install the peer dep on demand:

```bash
npm install playwright
npx playwright install chromium
```

Then:

```ts
await extract("https://some-spa.example", { useBrowser: "auto" });
```

`auto` only launches a browser when the static fetch returns a tiny body and an SPA-style root element (`#root`, `#app`, `#__next`, `#__nuxt`). Call `shutdownBrowser()` at process exit to release the Chromium instance.

## Not yet implemented

- PDF extraction
- YouTube (transcript + description)
- robots.txt enforcement

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Smoke tests:

```bash
node ./smoke.mjs       # library, real URLs
node ./smoke-mcp.mjs   # MCP server over stdio
```

## License

MIT
