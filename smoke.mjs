import { extract } from "./dist/index.js";

const urls = [
  "https://timeahead.in",
  "https://github.com/anthropics/anthropic-sdk-typescript",
];

for (const url of urls) {
  console.log(`\n=== ${url} ===`);
  try {
    const r = await extract(url, { maxTokens: 500, includeLinks: true });
    console.log({
      contentType: r.contentType,
      title: r.title,
      byline: r.byline,
      siteName: r.siteName,
      lang: r.lang,
      tokenCount: r.tokenCount,
      wordCount: r.wordCount,
      truncated: r.truncated,
      images: r.images.length,
      links: r.links.length,
    });
    console.log("--- markdown preview ---");
    console.log(r.markdown.slice(0, 400));
  } catch (e) {
    console.error("FAIL:", e.message);
  }
}
