import TurndownService from "turndown";

let cached: TurndownService | null = null;

export function getTurndown(): TurndownService {
  if (cached) return cached;
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
  });
  td.remove(["script", "style", "noscript", "iframe", "form", "nav", "aside"]);
  cached = td;
  return td;
}

export function htmlToMarkdown(html: string): string {
  return getTurndown()
    .turndown(html)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripTracking(url: string): string {
  try {
    const u = new URL(url);
    const drop = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "mc_cid",
      "mc_eid",
      "ref",
      "ref_src",
    ];
    for (const k of drop) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return url;
  }
}
