import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Small key/value settings (collection "settings"). The early-access doc is key "access":
 * `allow` = lowercased emails let in without being on the waitlist (judges, friends).
 */
const SettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 40 },
    allow: { type: [String], default: [] },
  },
  { timestamps: true, collection: "settings" },
);

export type SettingsDoc = InferSchemaType<typeof SettingsSchema>;
export const Settings: Model<SettingsDoc> =
  (mongoose.models.Settings as Model<SettingsDoc>) ?? mongoose.model("Settings", SettingsSchema);

export const ACCESS_KEY = "access";
