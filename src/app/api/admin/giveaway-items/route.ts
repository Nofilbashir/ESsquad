import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import GiveawayItem from "@/models/GiveawayItem";
import type { IGiveawayItem } from "@/models/GiveawayItem";
import mongoose from "mongoose";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const items = await GiveawayItem.find().sort({ name: 1 }).lean<IGiveawayItem[]>();

  return NextResponse.json({
    items: items.map((i) => ({
      _id: (i._id as mongoose.Types.ObjectId).toString(),
      name: i.name,
      estimatedValue: i.estimatedValue,
    })),
  });
}
