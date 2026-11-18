import type { RequestHandler } from "express";
import { HttpError } from "../lib/errors";

/** Ensures the cached Mongo connection is up before DB-backed handlers run. */
export function requireDb(connect: () => Promise<unknown>): RequestHandler {
  return async (_req, _res, next) => {
    try {
      await connect();
    } catch (err) {
      console.error("[db] connection failed:", err instanceof Error ? err.message : err);
      return next(new HttpError(503, "db_unavailable", "Database temporarily unavailable"));
    }
    next();
  };
}
