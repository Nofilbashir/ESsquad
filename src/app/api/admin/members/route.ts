import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import type { IMember } from "@/models/Member";
import Contribution from "@/models/Contribution";
import Settings from "@/models/Settings";
import type { ISettings } from "@/models/Settings";
import { calculateOutstanding } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const query: Record<string, unknown> = {};
  if (status && status !== "ALL") query.status = status;
  if (search) query.name = { $regex: search, $options: "i" };

  const [members, settings] = await Promise.all([
    Member.find(query).sort({ queuePosition: 1, createdAt: 1 }).lean<IMember[]>(),
    Settings.findOne().lean<ISettings>(),
  ]);

  const monthlyFee = settings?.monthlyFee ?? 100;

  // Aggregate totals per member
  const memberIds = members.map((m) => m._id);
  const [paidAgg] = await Promise.all([
    Contribution.aggregate([
      { $match: { memberId: { $in: memberIds }, status: "PAID" } },
      { $group: { _id: "$memberId", totalPaid: { $sum: "$amount" } } },
    ]),
  ]);

  const paidMap = new Map(paidAgg.map((a) => [a._id.toString(), a.totalPaid]));

  const enriched = members.map((m) => {
    const totalPaid = paidMap.get(m._id.toString()) ?? 0;
    const outstanding = calculateOutstanding(m.joinDate, monthlyFee, totalPaid);
    return { ...m, totalPaid, outstanding };
  });

  return NextResponse.json({ members: enriched, monthlyFee });
}
