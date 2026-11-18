import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Kept from v1 (collection "waitlists"); existing documents stay readable.
const WaitlistSchema = new Schema(
  {
    wallet: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    inviteCode: { type: String },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type WaitlistDoc = InferSchemaType<typeof WaitlistSchema>;
export const Waitlist: Model<WaitlistDoc> =
  (mongoose.models.Waitlist as Model<WaitlistDoc>) ?? mongoose.model("Waitlist", WaitlistSchema);
