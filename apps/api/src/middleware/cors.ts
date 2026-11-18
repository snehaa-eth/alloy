import cors from "cors";

/** Strict CORS: only exact origins from ALLOWED_ORIGINS. Requests without an Origin (curl, servers) pass. */
export function strictCors(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins.map((o) => new URL(o).origin));
  return cors({
    origin(origin, cb) {
      cb(null, !origin || allowed.has(origin));
    },
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  });
}
