"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Contribution from "@/models/Contribution";
import Member from "@/models/Member";
import Settings from "@/models/Settings";
import AuditLog from "@/models/AuditLog";
import { markPaymentSchema } from "@/schemas/contribution";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") throw new Error("Unauthorized");
  return session;
}

export async function markPayment(data: {
  memberId: string;
  month: number;
  year: number;
  status: "PAID" | "UNPAID";
}) {
  const session = await requireAdmin();
  await connectDB();

  const parsed = markPaymentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { memberId, month, year, status } = parsed.data;

  const settings = await Settings.findOne().lean() as { monthlyFee?: number } | null;
  const monthlyFee = settings?.monthlyFee ?? 100;

  const contribution = await Contribution.findOneAndUpdate(
    { memberId, month, year },
    {
      $set: {
        status,
        amount: monthlyFee,
        ...(status === "PAID"
          ? { recordedBy: session.user.id, recordedAt: new Date(), updatedBy: session.user.id }
          : { updatedBy: session.user.id, recordedBy: null, recordedAt: null }),
      },
    },
    { upsert: true, new: true }
  );

  await AuditLog.create({
    action: status === "PAID" ? "PAYMENT_MARKED_PAID" : "PAYMENT_MARKED_UNPAID",
    performedBy: session.user.id,
    targetId: contribution._id,
    targetModel: "Contribution",
    description: `Marked payment ${status} for member ${memberId} (${month}/${year})`,
    metadata: { memberId, month, year, amount: monthlyFee },
  });

  revalidatePath("/admin/contributions");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/members/${memberId}`);
  return { success: true };
}

