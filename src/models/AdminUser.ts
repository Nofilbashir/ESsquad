import mongoose, { Document, Schema } from "mongoose";

export interface IAdminUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "admin";
  createdAt: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, default: "admin", enum: ["admin"] },
  },
  { timestamps: true }
);

export default mongoose.models.AdminUser ||
  mongoose.model<IAdminUser>("AdminUser", AdminUserSchema);
