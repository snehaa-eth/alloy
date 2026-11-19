import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Human-written basket metadata only. Holdings, NAV, AUM, followers etc. come
 * from the chain via the indexer (Ponder); Mongo never stores money.
 * Keyed by (chainId, vault).
 */
const BasketMetaSchema = new Schema(
  {
    chainId: { type: Number, required: true },
    vault: { type: String, required: true }, // EIP-55 checksummed
    /** Display name override (on-chain name() is the default). */
    title: { type: String, maxlength: 80 },
    thesis: { type: String, maxlength: 2000 },
    imageUrl: { type: String, maxlength: 2048 },
    tags: { type: [String], default: [] },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, strict: "throw", collection: "baskets" },
);
BasketMetaSchema.index({ chainId: 1, vault: 1 }, { unique: true });
BasketMetaSchema.index({ chainId: 1, tags: 1 });

export type BasketMetaDoc = InferSchemaType<typeof BasketMetaSchema>;
export const BasketMeta: Model<BasketMetaDoc> =
  (mongoose.models.BasketMeta as Model<BasketMetaDoc>) ?? mongoose.model("BasketMeta", BasketMetaSchema);

export function toBasketMetaDto(doc: BasketMetaDoc & { updatedAt?: Date; createdAt?: Date }) {
  return {
    chainId: doc.chainId,
    vault: doc.vault,
    title: doc.title ?? null,
    thesis: doc.thesis ?? null,
    imageUrl: doc.imageUrl ?? null,
    tags: doc.tags ?? [],
    updatedBy: doc.updatedBy,
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
}
