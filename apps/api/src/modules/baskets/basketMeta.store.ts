import type { SupportedChainId } from "../../config/env";
import { BasketMeta, toBasketMetaDto } from "./basketMeta.model";

export type BasketMetaDto = ReturnType<typeof toBasketMetaDto>;

/** Read side of basket metadata. Injected so tests (and a down Mongo) don't block on-chain reads. */
export interface BasketMetaStore {
  /** Metadata for a chain keyed by lowercase vault, or null if Mongo is unavailable. */
  byChain(chainId: SupportedChainId): Promise<Map<string, BasketMetaDto> | null>;
}

const DB_WAIT_MS = 2_500;

export function createMongoMetaStore(connectDb: () => Promise<unknown>): BasketMetaStore {
  return {
    async byChain(chainId) {
      try {
        const docs = await withTimeout(
          (async () => {
            await connectDb();
            return BasketMeta.find({ chainId }).limit(1000).lean();
          })(),
          DB_WAIT_MS,
        );
        return new Map(docs.map((d) => [d.vault.toLowerCase(), toBasketMetaDto(d)]));
      } catch (err) {
        console.error("[baskets] metadata unavailable:", err instanceof Error ? err.message : err);
        return null;
      }
    },
  };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise<T>((_, rej) => {
      t = setTimeout(() => rej(new Error("metadata lookup timed out")), ms);
    }),
  ]);
}
