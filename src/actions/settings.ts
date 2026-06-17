"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Settings from "@/models/Settings";
import AuditLog from "@/models/AuditLog";
import { updateSettingsSchema } from "@/schemas/settings";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") throw new Error("Unauthorized");
  return session;
}

export async function updateSettings(data: {
  communityName: string;
  monthlyFee: number;
  currency: string;
}) {
  const session = await requireAdmin();
  await connectDB();

  const parsed = updateSettingsSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const settings = await Settings.findOneAndUpdate(
    {},
    { ...parsed.data, updatedBy: session.user.id },
    { upsert: true, new: true }
  );

  await AuditLog.create({
    action: "SETTINGS_UPDATED",
    performedBy: session.user.id,
    targetId: settings._id,
    targetModel: "Settings",
    description: `Updated settings`,
    metadata: parsed.data,
  });

  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function getSettings() {
  await connectDB();
  const settings = await Settings.findOne().lean();
  return settings ?? { communityName: "Car Community Fund", monthlyFee: 100, currency: "Rs." };
}
