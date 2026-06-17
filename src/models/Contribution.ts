import mongoose, { Document, Schema } from "mongoose";

export interface IContribution extends Document {
  memberId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  amount: number;
  status: "PAID" | "UNPAID";
  recordedBy: mongoose.Types.ObjectId | null;
  recordedAt: Date | null;
  updatedBy: mongoose.Types.ObjectId | null;
  updatedAt: Date;
}

const ContributionSchema = new Schema<IContribution>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["PAID", "UNPAID"], default: "UNPAID" },
    recordedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
    recordedAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true }
);

// One contribution record per member per month
ContributionSchema.index({ memberId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.Contribution ||
  mongoose.model<IContribution>("Contribution", ContributionSchema);
