import type { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new HttpError(400, "bad_request", message, details);
  }
  static unauthorized(message = "Authentication required") {
    return new HttpError(401, "unauthorized", message);
  }
  static forbidden(message = "Forbidden") {
    return new HttpError(403, "forbidden", message);
  }
  static notFound(message = "Not found") {
    return new HttpError(404, "not_found", message);
  }
  static conflict(message = "Conflict") {
    return new HttpError(409, "conflict", message);
  }

  /** Validation failure: expose only field paths and messages, never input values. */
  static fromZod(error: ZodError, location: string) {
    const details = error.issues.map((i) => ({
      location,
      path: i.path.map(String).join("."),
      message: i.message,
    }));
    return new HttpError(400, "validation_error", "Invalid request", details);
  }
}
