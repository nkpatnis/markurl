import { fetchPage } from "../fetch.js";
import { extractArticle, type ArticleExtraction } from "./article.js";

const GITHUB_REPO_RE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/i;

export function isGithubRepoUrl(url: string): boolean {
  return GITHUB_REPO_RE.test(url);
}

export async function extractGithub(
  url: string,
  opts: { userAgent?: string; timeoutMs?: number },
): Promise<ArticleExtraction> {
  const m = url.match(GITHUB_REPO_RE);
  if (!m) throw new Error("not a github repo url");
  const [, owner, repo] = m;

  // Try main, then master.
  const branches = ["main", "master"];
  for (const branch of branches) {
    const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
    try {
      const page = await fetchPage(readmeUrl, opts);
      if (page.status === 200 && page.body.trim()) {
        return {
          title: `${owner}/${repo}`,
          byline: owner ?? null,
          publishedAt: null,
          siteName: "GitHub",
          lang: "en",
          excerpt: null,
          markdown: page.body.trim(),
          images: [],
          links: [],
        };
      }
    } catch {
      // try next branch
    }
  }

  // Fallback: scrape the rendered repo page.
  const page = await fetchPage(url, opts);
  return extractArticle(page.body, page.finalUrl);
}
