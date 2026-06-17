import mongoose, { Document, Schema } from "mongoose";

export interface IGiveawayItem extends Document {
  name: string;
  description: string;
  estimatedValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const GiveawayItemSchema = new Schema<IGiveawayItem>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: "", trim: true },
    estimatedValue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.GiveawayItem ||
  mongoose.model<IGiveawayItem>("GiveawayItem", GiveawayItemSchema);
