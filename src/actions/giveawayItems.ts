"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import GiveawayItem from "@/models/GiveawayItem";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(300).optional(),
  estimatedValue: z.number().min(0).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") throw new Error("Unauthorized");
}

export async function createGiveawayItem(data: unknown) {
  await requireAdmin();
  await connectDB();

  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, description, estimatedValue } = parsed.data;

  const existing = await GiveawayItem.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (existing) return { error: "An item with this name already exists" };

  await GiveawayItem.create({ name, description: description ?? "", estimatedValue: estimatedValue ?? 0 });

  revalidatePath("/admin/giveaway-items");
  return { success: true };
}

export async function deleteGiveawayItem(id: string) {
  await requireAdmin();
  await connectDB();

  await GiveawayItem.findByIdAndDelete(id);

  revalidatePath("/admin/giveaway-items");
  return { success: true };
}
