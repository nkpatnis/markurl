import { describe, it, expect } from "vitest";
import { extractFromHtml } from "../src/index.js";

const sample = `<!doctype html>
<html lang="en">
  <head>
    <title>Sample Article</title>
    <meta name="author" content="Jane Doe" />
    <meta property="article:published_time" content="2026-01-15T00:00:00Z" />
    <meta property="og:site_name" content="Example Times" />
    <meta name="description" content="A short article for tests." />
  </head>
  <body>
    <article>
      <h1>Sample Article</h1>
      <p>This is a long paragraph used to satisfy Readability's content threshold. ${"Lorem ipsum dolor sit amet. ".repeat(40)}</p>
      <p>Second paragraph with a <a href="https://example.org/x?utm_source=foo">link</a>.</p>
      <img src="/img.png" alt="A picture" />
    </article>
  </body>
</html>`;

describe("extractFromHtml", () => {
  it("pulls title, byline, markdown, and metadata", () => {
    const r = extractFromHtml(sample, "https://example.com/post", { includeLinks: true });
    expect(r.title).toContain("Sample Article");
    expect(r.byline).toBe("Jane Doe");
    expect(r.publishedAt).toBe("2026-01-15T00:00:00Z");
    expect(r.siteName).toBe("Example Times");
    expect(r.markdown).toMatch(/Lorem ipsum/);
    expect(r.tokenCount).toBeGreaterThan(0);
    expect(r.images.some((i) => i.url.endsWith("/img.png"))).toBe(true);
    expect(r.links.some((l) => !l.url.includes("utm_source"))).toBe(true);
  });
});
