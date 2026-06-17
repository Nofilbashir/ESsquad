import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Giveaway from "@/models/Giveaway";
import Member from "@/models/Member";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const query: Record<string, unknown> = {};
  if (status && status !== "ALL") query.status = status;

  const giveaways = await Giveaway.find(query)
    .sort({ createdAt: -1 })
    .populate("recipients.memberId", "name phone")
    .lean();

  return NextResponse.json({ giveaways });
}
