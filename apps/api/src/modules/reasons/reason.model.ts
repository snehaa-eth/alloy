import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Rebalance reason text. `reasonHash` = keccak256(utf8(text)) is what the
 * creator passes to Basket.proposeRecipe(w, reasonHash), anchoring this text on-chain.
 */
const RebalanceReasonSchema = new Schema(
  {
    chainId: { type: Number, required: true },
    vault: { type: String, required: true },
    text: { type: String, required: true, maxlength: 500 },
    reasonHash: { type: String, required: true },
    author: { type: String, required: true },
    proposalId: { type: String },
  },
  { timestamps: true, strict: "throw", collection: "rebalance_reasons" },
);
RebalanceReasonSchema.index({ chainId: 1, vault: 1, reasonHash: 1 }, { unique: true });
RebalanceReasonSchema.index({ chainId: 1, vault: 1, createdAt: -1 });

export type RebalanceReasonDoc = InferSchemaType<typeof RebalanceReasonSchema>;
export const RebalanceReason: Model<RebalanceReasonDoc> =
  (mongoose.models.RebalanceReason as Model<RebalanceReasonDoc>) ??
  mongoose.model("RebalanceReason", RebalanceReasonSchema);

export function toReasonDto(doc: RebalanceReasonDoc & { createdAt?: Date }) {
  return {
    chainId: doc.chainId,
    vault: doc.vault,
    text: doc.text,
    reasonHash: doc.reasonHash,
    author: doc.author,
    proposalId: doc.proposalId ?? null,
    createdAt: doc.createdAt ?? null,
  };
}
