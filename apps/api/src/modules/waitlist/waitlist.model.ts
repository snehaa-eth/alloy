import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Kept from v1 (collection "waitlists"); existing documents stay readable.
const WaitlistSchema = new Schema(
  {
    wallet: { type: String },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    inviteCode: { type: String },
    isVerified: { type: Boolean, default: false },
    /** X handle without "@" (optional, from the /waitlist page). */
    xHandle: { type: String, trim: true, maxlength: 15 },
    /** Where the sign-up came from: "waitlist", or a ?ref= / utm_source tag. */
    source: { type: String, trim: true, maxlength: 40 },
    /** document.referrer at sign-up (truncated). */
    referrer: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

export type WaitlistDoc = InferSchemaType<typeof WaitlistSchema>;
export const Waitlist: Model<WaitlistDoc> =
  (mongoose.models.Waitlist as Model<WaitlistDoc>) ?? mongoose.model("Waitlist", WaitlistSchema);
