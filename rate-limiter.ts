import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitStore>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {
    this.cleanupInterval = setInterval(() => this.cleanup(), windowMs);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();
      const record = this.store.get(key);

      if (!record || now > record.resetAt) {
        this.store.set(key, {
          count: 1,
          resetAt: now + this.windowMs
        });
        return next();
      }

      if (record.count >= this.maxRequests) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', record.resetAt.toString());

        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: retryAfter,
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
        });
      }

      record.count++;
      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (this.maxRequests - record.count).toString());
      res.setHeader('X-RateLimit-Reset', record.resetAt.toString());

      next();
    };
  }

  private getKey(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetAt) {
        this.store.delete(key);
      }
    }
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return new RateLimiter(maxRequests, windowMs);
}
