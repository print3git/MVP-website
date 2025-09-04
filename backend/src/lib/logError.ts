import logger from "../logger";
import { capture } from "./logger.js";

export function logError(...args: unknown[]): void {
  if (process.env.NODE_ENV !== "test") {
    logger.error(...args);
  }
  const err =
    args[0] instanceof Error ? args[0] : new Error(args.map(String).join(" "));
  capture(err);
}
