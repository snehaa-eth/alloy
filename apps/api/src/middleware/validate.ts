import type { RequestHandler, Response } from "express";
import type { z } from "zod";
import { HttpError } from "../lib/errors";

export type RequestSchemas = {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
};

export type Validated<S extends RequestSchemas> = {
  [K in keyof S]: S[K] extends z.ZodType ? z.output<S[K]> : never;
};

/**
 * Validates params/query/body with zod and stores the parsed values on
 * res.locals.valid. Handlers must read inputs via getValid(), never from
 * req.* directly, so only whitelisted, typed fields reach Mongo.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, res, next) => {
    const out: Record<string, unknown> = {};
    for (const key of ["params", "query", "body"] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const parsed = schema.safeParse(req[key] ?? {});
      if (!parsed.success) return next(HttpError.fromZod(parsed.error, key));
      out[key] = parsed.data;
    }
    res.locals.valid = out;
    next();
  };
}

export function getValid<S extends RequestSchemas>(res: Response, _schemas: S): Validated<S> {
  return res.locals.valid as Validated<S>;
}
