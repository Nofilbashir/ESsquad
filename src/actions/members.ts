"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import Contribution from "@/models/Contribution";
import AuditLog from "@/models/AuditLog";
import Settings from "@/models/Settings";
import { createMemberSchema, updateMemberSchema } from "@/schemas/member";
import bcrypt from "bcryptjs";
import { getMonthRange } from "@/lib/utils";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

async function getNextQueuePosition(): Promise<number> {
  const lastMember = await Member.findOne({ queuePosition: { $ne: null } })
    .sort({ queuePosition: -1 })
    .lean();
  const pos = (lastMember as unknown as { queuePosition: number | null } | null);
  return pos ? (pos.queuePosition ?? 0) + 1 : 1;
}

export async function createMember(formData: FormData) {
  const session = await requireAdmin();
  await connectDB();

  const raw = {
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
    joinDate: formData.get("joinDate"),
  };

  const parsed = createMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, phone, email, password, joinDate } = parsed.data;

  const existing = await Member.findOne({ email });
  if (existing) return { error: "Email already exists" };

  const nextPosition = await getNextQueuePosition();

  const passwordHash = await bcrypt.hash(password, 12);
  const member = await Member.create({
    name,
    phone,
    email,
    passwordHash,
    joinDate: new Date(joinDate),
    queuePosition: nextPosition,
    status: "ACTIVE",
  });

  const settings = await Settings.findOne().lean() as { monthlyFee?: number } | null;
  const monthlyFee = settings?.monthlyFee ?? 100;
  const months = getMonthRange(new Date(joinDate));

  await Promise.all(
    months.map((m) =>
      Contribution.findOneAndUpdate(
        { memberId: member._id, month: m.month, year: m.year },
        { $setOnInsert: { memberId: member._id, month: m.month, year: m.year, amount: monthlyFee, status: "UNPAID" } },
        { upsert: true, new: true }
      )
    )
  );

  await AuditLog.create({
    action: "MEMBER_CREATED",
    performedBy: session.user.id,
    targetId: member._id,
    targetModel: "Member",
    description: `Created member ${name} (${email})`,
    metadata: { queuePosition: nextPosition },
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin/dashboard");
  return { success: true, memberId: member._id.toString() };
}

export async function updateMember(memberId: string, formData: FormData) {
  const session = await requireAdmin();
  await connectDB();

  const raw = {
    name: formData.get("name") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    status: formData.get("status") || undefined,
  };

  const parsed = updateMemberSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const member = await Member.findByIdAndUpdate(memberId, parsed.data, { new: true });
  if (!member) return { error: "Member not found" };

  await AuditLog.create({
    action: "MEMBER_UPDATED",
    performedBy: session.user.id,
    targetId: member._id,
    targetModel: "Member",
    description: `Updated member ${member.name}`,
    metadata: parsed.data,
  });

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  return { success: true };
}

export async function deactivateMember(memberId: string) {
  const session = await requireAdmin();
  await connectDB();

  const member = await Member.findByIdAndUpdate(
    memberId,
    { status: "INACTIVE", queuePosition: null },
    { new: true }
  );
  if (!member) return { error: "Member not found" };

  await compactQueuePositions();

  await AuditLog.create({
    action: "MEMBER_DEACTIVATED",
    performedBy: session.user.id,
    targetId: member._id,
    targetModel: "Member",
    description: `Deactivated member ${member.name}`,
    metadata: {},
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin/queue");
  return { success: true };
}

export async function reactivateMember(memberId: string) {
  const session = await requireAdmin();
  await connectDB();

  const nextPosition = await getNextQueuePosition();

  const member = await Member.findByIdAndUpdate(
    memberId,
    { status: "ACTIVE", queuePosition: nextPosition },
    { new: true }
  );
  if (!member) return { error: "Member not found" };

  await AuditLog.create({
    action: "MEMBER_UPDATED",
    performedBy: session.user.id,
    targetId: member._id,
    targetModel: "Member",
    description: `Reactivated member ${member.name} at queue position ${nextPosition}`,
    metadata: { queuePosition: nextPosition },
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin/queue");
  return { success: true };
}

export async function skipMemberInQueue(memberId: string) {
  const session = await requireAdmin();
  await connectDB();

  const member = await Member.findById(memberId);
  if (!member || member.queuePosition === null) return { error: "Member not in queue" };

  const oldPosition = member.queuePosition;

  // Temporarily remove the member from the queue, shift others up to fill the gap
  member.queuePosition = null;
  await member.save();

  await Member.updateMany(
    { queuePosition: { $gt: oldPosition }, status: "ACTIVE" },
    { $inc: { queuePosition: -1 } }
  );

  // Re-normalize to eliminate any accumulated gaps, then place skipped member at the end
  await compactQueuePositions();

  const last = await Member.findOne({ queuePosition: { $ne: null }, status: "ACTIVE" })
    .sort({ queuePosition: -1 })
    .lean() as unknown as { queuePosition: number | null } | null;

  const newPosition = last ? (last.queuePosition ?? 0) + 1 : 1;
  member.queuePosition = newPosition;
  await member.save();

  await AuditLog.create({
    action: "QUEUE_MEMBER_SKIPPED",
    performedBy: session.user.id,
    targetId: member._id,
    targetModel: "Member",
    description: `Skipped ${member.name} in queue (was #${oldPosition}, now #${newPosition})`,
    metadata: { oldPosition, newPosition },
  });

  revalidatePath("/admin/queue");
  return { success: true };
}

export async function resetMemberPassword(memberId: string, password: string) {
  await requireAdmin();
  await connectDB();

  if (password.length < 6) return { error: "Password must be at least 6 characters" };

  const passwordHash = await bcrypt.hash(password, 12);
  await Member.findByIdAndUpdate(memberId, { passwordHash });

  revalidatePath(`/admin/members/${memberId}`);
  return { success: true };
}

async function compactQueuePositions() {
  const members = await Member.find({ queuePosition: { $ne: null }, status: "ACTIVE" })
    .sort({ queuePosition: 1 })
    .select("_id queuePosition");

  await Promise.all(
    members.map((m, i) =>
      Member.findByIdAndUpdate(m._id, { queuePosition: i + 1 })
    )
  );
}
