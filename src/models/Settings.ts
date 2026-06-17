import mongoose, { Document, Schema } from "mongoose";

export interface ISettings extends Document {
  communityName: string;
  monthlyFee: number;
  currency: string;
  updatedBy: mongoose.Types.ObjectId | null;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    communityName: { type: String, default: "Car Community Fund" },
    monthlyFee: { type: Number, default: 100, min: 1 },
    currency: { type: String, default: "Rs." },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);
