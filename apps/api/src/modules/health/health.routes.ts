import { Router } from "express";
import { dbState } from "../../config/db";
import type { AppDeps } from "../../deps";

export function healthRouter(deps: AppDeps) {
  const router = Router();
  router.get("/health", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({
      status: "ok",
      service: "alloy-api",
      version: "2",
      chains: deps.env.CHAIN_IDS,
      db: dbState(),
      time: new Date().toISOString(),
    });
  });
  return router;
}
