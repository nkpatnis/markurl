import { encode } from "gpt-tokenizer";

export function countTokens(text: string): number {
  return encode(text).length;
}

export function trimToTokenBudget(
  markdown: string,
  maxTokens: number,
): { text: string; truncated: boolean } {
  const current = countTokens(markdown);
  if (current <= maxTokens) return { text: markdown, truncated: false };

  // Section-aware trim: keep heading-bounded sections until budget runs out.
  const sections = markdown.split(/\n(?=#{1,6} )/);
  const kept: string[] = [];
  let total = 0;
  for (const s of sections) {
    const t = countTokens(s);
    if (total + t > maxTokens) break;
    kept.push(s);
    total += t;
  }

  if (kept.length === 0) {
    // No headings or first section too big — character-prorated cut.
    const ratio = maxTokens / current;
    const cut = Math.max(200, Math.floor(markdown.length * ratio) - 64);
    return {
      text: markdown.slice(0, cut).trimEnd() + "\n\n_[truncated]_",
      truncated: true,
    };
  }

  return { text: kept.join("\n").trimEnd() + "\n\n_[truncated]_", truncated: true };
}
