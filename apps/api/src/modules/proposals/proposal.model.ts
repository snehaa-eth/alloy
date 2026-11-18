import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

export const PROPOSAL_STATUSES = ["pending", "approved", "rejected", "expired"] as const;

/**
 * AI-agent recipe proposals. The agent never signs: a creator approves here,
 * then calls Basket.proposeRecipe(weights, reasonHash) from their wallet.
 */
const ProposalSchema = new Schema(
  {
    chainId: { type: Number, required: true },
    vault: { type: String, required: true },
    weights: {
      type: [{ _id: false, token: { type: String, required: true }, bps: { type: Number, required: true } }],
      required: true,
    },
    reason: { type: String, required: true, maxlength: 500 },
    reasonHash: { type: String, required: true },
    model: { type: String, required: true, maxlength: 100 },
    inputsHash: { type: String, required: true },
    status: { type: String, enum: PROPOSAL_STATUSES, default: "pending" },
    decidedBy: { type: String },
    decidedAt: { type: Date },
  },
  { timestamps: true, strict: "throw", collection: "proposals" },
);
ProposalSchema.index({ chainId: 1, vault: 1, status: 1, createdAt: -1 });

export type ProposalDoc = InferSchemaType<typeof ProposalSchema>;
export const Proposal: Model<ProposalDoc> =
  (mongoose.models.Proposal as Model<ProposalDoc>) ?? mongoose.model("Proposal", ProposalSchema);

type ProposalLike = {
  _id: Types.ObjectId | unknown;
  chainId: number;
  vault: string;
  weights: ReadonlyArray<{ token: string; bps: number }>;
  reason: string;
  reasonHash: string;
  model: string;
  inputsHash: string;
  status?: (typeof PROPOSAL_STATUSES)[number] | null;
  decidedBy?: string | null;
  decidedAt?: Date | null;
  createdAt?: Date;
};

export function toProposalDto(doc: ProposalLike) {
  return {
    id: String(doc._id),
    chainId: doc.chainId,
    vault: doc.vault,
    weights: doc.weights.map((w) => ({ token: w.token, bps: w.bps })),
    reason: doc.reason,
    reasonHash: doc.reasonHash,
    model: doc.model,
    inputsHash: doc.inputsHash,
    status: doc.status ?? "pending",
    decidedBy: doc.decidedBy ?? null,
    decidedAt: doc.decidedAt ?? null,
    createdAt: doc.createdAt ?? null,
    disclaimer: "AI-generated, not investment advice",
  };
}
