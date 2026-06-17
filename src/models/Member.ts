import mongoose, { Document, Schema } from "mongoose";

export interface IMember extends Document {
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  joinDate: Date;
  queuePosition: number | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    joinDate: { type: Date, required: true },
    queuePosition: { type: Number, default: null },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true }
);

MemberSchema.index({ queuePosition: 1 }, { sparse: true });

export default mongoose.models.Member || mongoose.model<IMember>("Member", MemberSchema);
