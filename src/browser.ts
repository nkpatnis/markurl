import type { FetchedPage } from "./fetch.js";

type LaunchedBrowser = {
  newPage(): Promise<BrowserPage>;
  close(): Promise<void>;
};

type BrowserPage = {
  goto(url: string, opts?: { waitUntil?: string; timeout?: number }): Promise<{ status(): number; headers(): Record<string, string> } | null>;
  content(): Promise<string>;
  url(): string;
  close(): Promise<void>;
};

let browserPromise: Promise<LaunchedBrowser> | null = null;

async function getBrowser(): Promise<LaunchedBrowser> {
  if (browserPromise) return browserPromise;
  browserPromise = (async () => {
    let mod: unknown;
    try {
      // Indirect specifier prevents TS from resolving the optional peer dep at build time.
      const specifier = "playwright";
      mod = await import(/* @vite-ignore */ specifier);
    } catch {
      throw new Error(
        "playwright is not installed. Install it as a peer dependency: `npm install playwright` and then `npx playwright install chromium`.",
      );
    }
    const { chromium } = mod as { chromium: { launch(opts?: { headless?: boolean }): Promise<LaunchedBrowser> } };
    return chromium.launch({ headless: true });
  })();
  return browserPromise;
}

export async function fetchPageWithBrowser(
  url: string,
  opts: { timeoutMs?: number; userAgent?: string } = {},
): Promise<FetchedPage> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const res = await page.goto(url, {
      waitUntil: "networkidle",
      timeout: opts.timeoutMs ?? 30_000,
    });
    const body = await page.content();
    const finalUrl = page.url();
    const headers = res?.headers() ?? {};
    return {
      finalUrl,
      status: res?.status() ?? 200,
      contentType: headers["content-type"] ?? "text/html",
      body,
    };
  } finally {
    await page.close();
  }
}

export async function shutdownBrowser(): Promise<void> {
  if (!browserPromise) return;
  const b = await browserPromise;
  browserPromise = null;
  await b.close();
}
