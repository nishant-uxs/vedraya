import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, "NOT_FOUND", "Route not found"));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (isRecord(err)) {
    // body-parser: malformed JSON
    if (err.type === "entity.parse.failed" || err.status === 400 || err.statusCode === 400) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Malformed request body" },
      });
    }
    // body-parser: oversized payload
    if (err.type === "entity.too.large" || err.status === 413 || err.statusCode === 413) {
      return res.status(413).json({
        error: { code: "PAYLOAD_TOO_LARGE", message: "Request entity too large" },
      });
    }
    // pg invalid uuid / syntax → client error, not internal
    if (err.code === "22P02") {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid identifier format" },
      });
    }
  }

  console.error(err);
  return res.status(500).json({
    error: { code: "INTERNAL", message: "Internal server error" },
  });
}
