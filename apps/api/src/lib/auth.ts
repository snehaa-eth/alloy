import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { PrivyClient } from "@privy-io/node";
import { getAddress, isAddress, isAddressEqual, type Address } from "viem";
import type { Env, SupportedChainId } from "../config/env";
import type { CreatorReader } from "./chain";
import { HttpError } from "./errors";

export interface AuthUser {
  /** Privy DID, e.g. did:privy:... */
  userId: string;
  /** EVM wallets linked to the Privy user (embedded, external and smart wallets), checksummed. */
  wallets: Address[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/** Verifies a bearer token and resolves the caller. Injected so tests can stub Privy. */
export interface AuthVerifier {
  verify(accessToken: string): Promise<AuthUser>;
}

const USER_CACHE_TTL_MS = 60_000;

/**
 * Privy implementation: verifies the access token's signature/expiry/app id
 * locally (JWKS), then fetches linked wallets from the Privy API (cached 60s
 * per user, per instance).
 */
export function createPrivyVerifier(env: Env): AuthVerifier {
  let client: PrivyClient | null = null;
  const cache = new Map<string, { wallets: Address[]; expires: number }>();

  return {
    async verify(accessToken) {
      client ??= new PrivyClient({ appId: env.PRIVY_APP_ID, appSecret: env.PRIVY_APP_SECRET });
      const claims = await client.utils().auth().verifyAccessToken(accessToken);

      const hit = cache.get(claims.user_id);
      if (hit && hit.expires > Date.now()) return { userId: claims.user_id, wallets: hit.wallets };

      const user = await client.users()._get(claims.user_id);
      const wallets: Address[] = [];
      for (const acct of user.linked_accounts) {
        const a = acct as { type?: string; chain_type?: string; address?: string };
        const isEvmWallet = (a.type === "wallet" && a.chain_type === "ethereum") || a.type === "smart_wallet";
        if (isEvmWallet && a.address && isAddress(a.address, { strict: false })) {
          wallets.push(getAddress(a.address));
        }
      }
      cache.set(claims.user_id, { wallets, expires: Date.now() + USER_CACHE_TTL_MS });
      return { userId: claims.user_id, wallets };
    },
  };
}

function bearer(req: Request): string | null {
  const header = req.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

/** Requires a valid Privy access token; sets req.user. */
export function requireAuth(verifier: AuthVerifier): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = bearer(req);
    if (!token) return next(HttpError.unauthorized());
    try {
      req.user = await verifier.verify(token);
    } catch {
      return next(HttpError.unauthorized("Invalid or expired access token"));
    }
    next();
  };
}

/** Throws 403 unless one of the caller's linked wallets is the basket's on-chain creator. */
export async function assertCreator(
  reader: CreatorReader,
  user: AuthUser | undefined,
  chainId: SupportedChainId,
  vault: Address,
): Promise<Address> {
  if (!user) throw HttpError.unauthorized();
  const creator = await reader.getCreator(chainId, vault);
  if (!creator) throw HttpError.forbidden("Not a recognised basket on this chain");
  const match = user.wallets.find((w) => isAddressEqual(w, creator));
  if (!match) throw HttpError.forbidden("Only the basket creator can do this");
  return match;
}

/**
 * Middleware form of assertCreator. `target` reads chainId/vault from the
 * already-validated request (res.locals.valid). Sets res.locals.creator.
 */
export function requireCreator(
  reader: CreatorReader,
  target: (req: Request, res: Response) => { chainId: SupportedChainId; vault: Address },
): RequestHandler {
  return async (req, res, next) => {
    const { chainId, vault } = target(req, res);
    res.locals.creator = await assertCreator(reader, req.user, chainId, vault);
    next();
  };
}

/** Machine-to-machine auth (AI agent, cron): `Authorization: Bearer <CRON_SECRET>`. */
export function requireServiceKey(env: Env): RequestHandler {
  return (req, _res, next) => {
    if (!env.CRON_SECRET) return next(new HttpError(503, "disabled", "Service endpoint not configured"));
    const token = bearer(req);
    const a = Buffer.from(token ?? "");
    const b = Buffer.from(env.CRON_SECRET);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return next(HttpError.unauthorized());
    next();
  };
}
