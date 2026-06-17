import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import type { IMember } from "@/models/Member";
import Giveaway from "@/models/Giveaway";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const members = await Member.find({ status: "ACTIVE", queuePosition: { $ne: null } })
    .sort({ queuePosition: 1 })
    .select("_id name phone queuePosition joinDate status")
    .lean<IMember[]>();

  // Find which members have already received giveaways
  const receivedIds = await Giveaway.distinct("recipients.memberId", { status: "DISTRIBUTED" });
  const receivedSet = new Set(receivedIds.map((id) => id.toString()));

  const enriched = members.map((m) => ({
    ...m,
    hasReceivedGiveaway: receivedSet.has(m._id.toString()),
  }));

  return NextResponse.json({ queue: enriched });
}
