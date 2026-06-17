import mongoose, { Document, Schema } from "mongoose";

export type AuditAction =
  | "MEMBER_CREATED"
  | "MEMBER_UPDATED"
  | "MEMBER_DEACTIVATED"
  | "PAYMENT_MARKED_PAID"
  | "PAYMENT_MARKED_UNPAID"
  | "GIVEAWAY_CREATED"
  | "GIVEAWAY_DISTRIBUTED"
  | "QUEUE_REORDERED"
  | "QUEUE_MEMBER_SKIPPED"
  | "SETTINGS_UPDATED";

export interface IAuditLog extends Document {
  action: AuditAction;
  performedBy: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId | null;
  targetModel: string | null;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    targetId: { type: Schema.Types.ObjectId, default: null },
    targetModel: { type: String, default: null },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
