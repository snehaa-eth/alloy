import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import type { AppDeps } from "../../deps";
import { isRevert, revertName } from "../../lib/chain";
import { HttpError } from "../../lib/errors";
import { zAddress } from "../../lib/schemas";
import { getValid, validate } from "../../middleware/validate";

const DAY_MS = 24 * 60 * 60_000;

/**
 * POST /faucet/drip { address } — the /try judge path. A relayer (RELAYER_PK) pays gas for
 * Faucet.dripTo(address) on Base Sepolia (1,000 tUSDC). Limits, outermost first:
 *   1. per IP: `faucetIpPerDay` requests per 24h (all outcomes count);
 *   2. per address: `faucetAddressPerDay` successful drips per 24h;
 *   3. the contract's own 24h per-recipient cooldown and global daily cap (authoritative).
 * The in-memory limits are per instance; (3) holds across instances.
 */
export function faucetRouter(deps: AppDeps) {
  const router = Router();
  const cfg = deps.rateLimits;
  const message = { error: { code: "rate_limited", message: "Faucet limit reached, try again tomorrow." } };

  const perIp = rateLimit({
    windowMs: DAY_MS,
    limit: cfg.faucetIpPerDay ?? 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message,
  });
  const perAddress = rateLimit({
    windowMs: DAY_MS,
    limit: cfg.faucetAddressPerDay ?? 1,
    standardHeaders: false,
    legacyHeaders: false,
    skipFailedRequests: true, // a failed drip doesn't burn the address's daily slot
    keyGenerator: (_req, res) => `addr:${(res.locals.valid?.body?.address as string).toLowerCase()}`,
    message,
  });

  const schemas = {
    body: z.strictObject({
      address: zAddress,
      chainId: z.literal(84532).optional(),
    }),
  };

  router.post(
    "/faucet/drip",
    perIp,
    validate(schemas),
    (_req, _res, next) => {
      if (!deps.faucet) {
        return next(
          new HttpError(501, "faucet_disabled", "The faucet relayer is not configured on this server (RELAYER_PK unset)"),
        );
      }
      next();
    },
    perAddress,
    async (_req, res) => {
      const { body } = getValid(res, schemas);
      const faucet = deps.faucet!;
      let wait: number;
      try {
        wait = await faucet.availableIn(body.address);
      } catch {
        throw new HttpError(502, "rpc_unavailable", "Chain RPC temporarily unavailable");
      }
      if (wait > 0) {
        throw new HttpError(429, "faucet_cooldown", "This address already received test funds in the last 24h", {
          availableAt: new Date(Date.now() + wait * 1000).toISOString(),
        });
      }
      let hash: `0x${string}`;
      try {
        hash = await faucet.drip(body.address);
      } catch (err) {
        const name = revertName(err);
        if (name === "CoolingDown") throw new HttpError(429, "faucet_cooldown", "This address already received test funds in the last 24h");
        if (name === "DailyCapReached") throw new HttpError(429, "faucet_daily_cap", "The faucet's daily cap is reached, try tomorrow");
        if (isRevert(err)) throw new HttpError(422, "faucet_reverted", `The faucet rejected this drip${name ? ` (${name})` : ""}`);
        console.error("[faucet] relay failed:", err instanceof Error ? err.message.split("\n")[0] : err);
        throw new HttpError(502, "relay_failed", "Could not send the faucet transaction, try again shortly");
      }
      res.status(202).json({
        data: {
          chainId: 84532,
          address: body.address,
          faucet: faucet.faucet,
          txHash: hash,
          explorerUrl: `https://sepolia.basescan.org/tx/${hash}`,
        },
      });
    },
  );
  return router;
}
