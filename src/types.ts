import { z } from "zod";

export const ExtractImageSchema = z.object({
  url: z.string(),
  alt: z.string().optional(),
});

export const ExtractLinkSchema = z.object({
  url: z.string(),
  text: z.string(),
});

export const ExtractResultSchema = z.object({
  url: z.string(),
  finalUrl: z.string(),
  contentType: z.enum(["article", "github", "generic"]),
  title: z.string().nullable(),
  byline: z.string().nullable(),
  publishedAt: z.string().nullable(),
  siteName: z.string().nullable(),
  lang: z.string().nullable(),
  excerpt: z.string().nullable(),
  markdown: z.string(),
  wordCount: z.number(),
  tokenCount: z.number(),
  truncated: z.boolean(),
  images: z.array(ExtractImageSchema),
  links: z.array(ExtractLinkSchema),
});

export type ExtractResult = z.infer<typeof ExtractResultSchema>;

export const ExtractOptionsSchema = z.object({
  maxTokens: z.number().int().positive().optional(),
  userAgent: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  followRedirects: z.boolean().optional(),
  includeImages: z.boolean().optional(),
  includeLinks: z.boolean().optional(),
  useBrowser: z.enum(["never", "auto", "always"]).optional(),
});

export type ExtractOptions = z.infer<typeof ExtractOptionsSchema>;
