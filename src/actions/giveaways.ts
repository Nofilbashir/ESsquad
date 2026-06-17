"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Giveaway from "@/models/Giveaway";
import Member from "@/models/Member";
import type { IMember } from "@/models/Member";
import AuditLog from "@/models/AuditLog";
import { createGiveawaySchema } from "@/schemas/giveaway";
import type { CreateGiveawayInput } from "@/schemas/giveaway";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") throw new Error("Unauthorized");
  return session;
}

export async function createGiveaway(data: CreateGiveawayInput) {
  const session = await requireAdmin();
  await connectDB();

  const parsed = createGiveawaySchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { month, year, title, recipients, notes } = parsed.data;

  // Fetch queue positions for all recipients
  const memberIds = recipients.map((r) => r.memberId);
  const membersInQueue = await Member.find({ _id: { $in: memberIds } })
    .select("_id queuePosition")
    .lean<IMember[]>();

  const positionMap = new Map(membersInQueue.map((m) => [m._id.toString(), m.queuePosition]));

  const recipientsWithPosition = recipients.map((r) => ({
    memberId: r.memberId,
    itemName: r.itemName,
    itemValue: r.itemValue ?? 0,
    queuePositionAtTime: positionMap.get(r.memberId) ?? 0,
  }));

  const giveaway = await Giveaway.create({
    month,
    year,
    title,
    recipients: recipientsWithPosition,
    notes: notes ?? "",
    status: "DRAFT",
    createdBy: session.user.id,
  });

  await AuditLog.create({
    action: "GIVEAWAY_CREATED",
    performedBy: session.user.id,
    targetId: giveaway._id,
    targetModel: "Giveaway",
    description: `Created giveaway "${title}" for ${month}/${year} with ${recipients.length} prize(s)`,
    metadata: { month, year, prizeCount: recipients.length },
  });

  revalidatePath("/admin/giveaways");
  revalidatePath("/admin/dashboard");
  return { success: true, giveawayId: giveaway._id.toString() };
}

export async function distributeGiveaway(giveawayId: string) {
  const session = await requireAdmin();
  await connectDB();

  const giveaway = await Giveaway.findById(giveawayId);
  if (!giveaway) return { error: "Giveaway not found" };
  if (giveaway.status === "DISTRIBUTED") return { error: "Giveaway already distributed" };

  giveaway.status = "DISTRIBUTED";
  giveaway.distributedAt = new Date();
  await giveaway.save();

  await AuditLog.create({
    action: "GIVEAWAY_DISTRIBUTED",
    performedBy: session.user.id,
    targetId: giveaway._id,
    targetModel: "Giveaway",
    description: `Distributed giveaway "${giveaway.title}" (${giveaway.recipients.length} prizes)`,
    metadata: { giveawayId, prizeCount: giveaway.recipients.length },
  });

  revalidatePath("/admin/giveaways");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function deleteGiveaway(giveawayId: string) {
  const session = await requireAdmin();
  await connectDB();

  const giveaway = await Giveaway.findById(giveawayId);
  if (!giveaway) return { error: "Giveaway not found" };
  if (giveaway.status === "DISTRIBUTED") return { error: "Cannot delete a distributed giveaway" };

  await Giveaway.findByIdAndDelete(giveawayId);

  revalidatePath("/admin/giveaways");
  return { success: true };
}
