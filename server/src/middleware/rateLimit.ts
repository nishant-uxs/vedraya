import type { NextFunction, Request, Response } from "express";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { rateLimitBuckets } from "../db/schema.js";
import { AppError } from "./errors.js";

export type RateLimitIncrementResult = { count: number; resetAt: number };

/** Pluggable store — memory for local demo; DB for multi-process. */
export interface RateLimiterStore {
  increment(key: string, windowMs: number): Promise<RateLimitIncrementResult>;
}

export class MemoryRateLimiterStore implements RateLimiterStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string, windowMs: number): Promise<RateLimitIncrementResult> {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    return { count: bucket.count, resetAt: bucket.resetAt };
  }
}

export class DbRateLimiterStore implements RateLimiterStore {
  async increment(key: string, windowMs: number): Promise<RateLimitIncrementResult> {
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);

    const [existing] = await db
      .select()
      .from(rateLimitBuckets)
      .where(eq(rateLimitBuckets.bucketKey, key))
      .limit(1);

    if (!existing || existing.resetAt.getTime() <= now.getTime()) {
      await db
        .insert(rateLimitBuckets)
        .values({ bucketKey: key, count: 1, resetAt })
        .onConflictDoUpdate({
          target: rateLimitBuckets.bucketKey,
          set: { count: 1, resetAt },
        });
      return { count: 1, resetAt: resetAt.getTime() };
    }

    const [updated] = await db
      .update(rateLimitBuckets)
      .set({ count: sql`${rateLimitBuckets.count} + 1` })
      .where(and(eq(rateLimitBuckets.bucketKey, key), gt(rateLimitBuckets.resetAt, now)))
      .returning();

    if (!updated) {
      await db
        .insert(rateLimitBuckets)
        .values({ bucketKey: key, count: 1, resetAt })
        .onConflictDoUpdate({
          target: rateLimitBuckets.bucketKey,
          set: { count: 1, resetAt },
        });
      return { count: 1, resetAt: resetAt.getTime() };
    }

    return { count: updated.count, resetAt: updated.resetAt.getTime() };
  }
}

const defaultStore: RateLimiterStore =
  process.env.RATE_LIMIT_STORE === "db" ? new DbRateLimiterStore() : new MemoryRateLimiterStore();

/** Rate limit middleware using pluggable store (memory default, DB when RATE_LIMIT_STORE=db). */
export function rateLimit(opts: {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
  store?: RateLimiterStore;
}) {
  const store = opts.store ?? defaultStore;
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const key = opts.key?.(req) ?? `${req.ip}:${req.path}`;
      const result = await store.increment(key, opts.windowMs);
      if (result.count > opts.max) {
        return next(
          new AppError(429, "RATE_LIMITED", "Too many requests. Try again later.", {
            retryAfterMs: Math.max(0, result.resetAt - Date.now()),
          }),
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
