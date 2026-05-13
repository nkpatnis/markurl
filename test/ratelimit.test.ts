import { describe, it, expect } from "vitest";
import { HostRateLimiter } from "../src/ratelimit.js";

describe("HostRateLimiter", () => {
  it("spaces requests to the same host", async () => {
    const l = new HostRateLimiter({ minIntervalMs: 30 });
    const t0 = Date.now();
    await l.acquire("a.test");
    await l.acquire("a.test");
    await l.acquire("a.test");
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(55);
  });

  it("does not delay across distinct hosts", async () => {
    const l = new HostRateLimiter({ minIntervalMs: 100 });
    const t0 = Date.now();
    await l.acquire("a.test");
    await l.acquire("b.test");
    await l.acquire("c.test");
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(50);
  });
});
