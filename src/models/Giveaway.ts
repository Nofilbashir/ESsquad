import mongoose, { Document, Schema } from "mongoose";

export interface IGiveawayRecipient {
  memberId: mongoose.Types.ObjectId;
  itemName: string;
  itemValue: number;
  queuePositionAtTime: number;
}

export interface IGiveaway extends Document {
  month: number;
  year: number;
  title: string;
  recipients: IGiveawayRecipient[];
  status: "DRAFT" | "DISTRIBUTED";
  notes: string;
  createdBy: mongoose.Types.ObjectId;
  distributedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const GiveawaySchema = new Schema<IGiveaway>(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    recipients: [
      {
        memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
        itemName: { type: String, required: true, trim: true },
        itemValue: { type: Number, default: 0 },
        queuePositionAtTime: { type: Number, required: true },
      },
    ],
    status: { type: String, enum: ["DRAFT", "DISTRIBUTED"], default: "DRAFT" },
    notes: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    distributedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Delete cached model to force fresh registration when schema changes (dev hot-reload safe)
delete (mongoose.models as Record<string, unknown>).Giveaway;
export default mongoose.model<IGiveaway>("Giveaway", GiveawaySchema);
