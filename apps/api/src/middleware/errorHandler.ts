import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "../lib/errors";

export const notFound: RequestHandler = (_req, _res, next) => next(HttpError.notFound("Route not found"));

/**
 * Maps known errors to stable JSON; everything else becomes a generic 500.
 * Never returns stack traces, driver messages or input values to the client.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let httpErr: HttpError;
  if (err instanceof HttpError) {
    httpErr = err;
  } else if (err?.type === "entity.parse.failed") {
    httpErr = HttpError.badRequest("Malformed JSON body");
  } else if (err?.type === "entity.too.large") {
    httpErr = new HttpError(413, "payload_too_large", "Payload too large");
  } else if (err?.name === "ValidationError" || err?.name === "CastError") {
    httpErr = HttpError.badRequest("Invalid data");
  } else if (err?.code === 11000) {
    httpErr = HttpError.conflict("Already exists");
  } else {
    httpErr = new HttpError(500, "internal_error", "Internal server error");
  }

  if (!(err instanceof HttpError)) {
    // Unexpected error: server-side log only. Keep it to the message/stack, never the request body.
    console.error(`[api] ${req.method} ${req.path} ->`, err instanceof Error ? err.stack ?? err.message : err);
  }

  if (res.headersSent) return;
  res.status(httpErr.status).json({
    error: {
      code: httpErr.code,
      message: httpErr.message,
      ...(httpErr.details !== undefined ? { details: httpErr.details } : {}),
    },
  });
};
