import { isGithubRepoUrl } from "./extractors/github.js";

export type ContentType = "article" | "github" | "generic";

export function routeUrl(url: string): ContentType {
  if (isGithubRepoUrl(url)) return "github";
  return "article";
}
