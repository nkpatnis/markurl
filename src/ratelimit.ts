export interface RateLimiter {
  acquire(host: string): Promise<void>;
}

export class HostRateLimiter implements RateLimiter {
  private readonly minIntervalMs: number;
  private readonly nextAvailable = new Map<string, number>();

  constructor(opts: { minIntervalMs?: number } = {}) {
    this.minIntervalMs = opts.minIntervalMs ?? 500;
  }

  async acquire(host: string): Promise<void> {
    const now = Date.now();
    const next = this.nextAvailable.get(host) ?? 0;
    const waitMs = Math.max(0, next - now);
    const startAt = Math.max(now, next);
    this.nextAvailable.set(host, startAt + this.minIntervalMs);
    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
  }
}

let defaultLimiter: RateLimiter | null = null;
export function getDefaultLimiter(): RateLimiter {
  if (!defaultLimiter) defaultLimiter = new HostRateLimiter();
  return defaultLimiter;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
