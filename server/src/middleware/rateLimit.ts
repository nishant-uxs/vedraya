import type { NextFunction, Request, Response } from "express";
import { AppError } from "./errors.js";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Simple in-memory rate limiter (single-process prototype). */
export function rateLimit(opts: { windowMs: number; max: number; key?: (req: Request) => string }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = opts.key?.(req) ?? `${req.ip}:${req.path}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > opts.max) {
      return next(
        new AppError(429, "RATE_LIMITED", "Too many requests. Try again later.", {
          retryAfterMs: bucket.resetAt - now,
        }),
      );
    }
    next();
  };
}
