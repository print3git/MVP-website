import type { NextFunction, Request, Response } from "express";
import logger from "../logger";
import { capture } from "../lib/logger";

export default function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const context = {
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
  };
  try {
    logger.error("Error handling request", context);
  } catch {
    // ignore logging failures
  }
  capture(err);
  res.status(500).json({ error: "Internal Server Error" });
}
