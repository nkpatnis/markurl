import { describe, it, expect } from "vitest";
import { MemoryCache } from "../src/cache.js";

const page = {
  finalUrl: "https://x.test/",
  status: 200,
  contentType: "text/html",
  body: "<p>hi</p>",
};

describe("MemoryCache", () => {
  it("returns set values", () => {
    const c = new MemoryCache();
    c.set("k", page);
    expect(c.get("k")).toEqual(page);
  });

  it("expires entries past ttl", async () => {
    const c = new MemoryCache({ ttlMs: 10 });
    c.set("k", page);
    await new Promise((r) => setTimeout(r, 20));
    expect(c.get("k")).toBeUndefined();
  });

  it("evicts oldest beyond maxEntries", () => {
    const c = new MemoryCache({ maxEntries: 2 });
    c.set("a", page);
    c.set("b", page);
    c.set("c", page);
    expect(c.get("a")).toBeUndefined();
    expect(c.get("b")).toBeDefined();
    expect(c.get("c")).toBeDefined();
  });
});
