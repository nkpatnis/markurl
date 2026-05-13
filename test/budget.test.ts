import { describe, it, expect } from "vitest";
import { countTokens, trimToTokenBudget } from "../src/budget.js";

describe("budget", () => {
  it("returns unchanged when under budget", () => {
    const md = "# Hello\n\nshort body";
    const r = trimToTokenBudget(md, 1000);
    expect(r.truncated).toBe(false);
    expect(r.text).toBe(md);
  });

  it("trims by section when over budget", () => {
    const md = "# A\n\n" + "word ".repeat(2000) + "\n\n# B\n\nmore";
    const r = trimToTokenBudget(md, 50);
    expect(r.truncated).toBe(true);
    expect(countTokens(r.text)).toBeLessThanOrEqual(200);
  });
});
