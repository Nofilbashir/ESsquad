import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import type { IMember } from "@/models/Member";
import Contribution from "@/models/Contribution";
import type { IContribution } from "@/models/Contribution";
import Settings from "@/models/Settings";
import type { ISettings } from "@/models/Settings";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

  const [activeMembers, settings] = await Promise.all([
    Member.find({ status: "ACTIVE" })
      .sort({ queuePosition: 1, name: 1 })
      .select("_id name phone queuePosition joinDate")
      .lean<IMember[]>(),
    Settings.findOne().lean<ISettings>(),
  ]);

  const monthlyFee = settings?.monthlyFee ?? 100;

  // Filter members who should have contributions this month
  const eligibleMembers = activeMembers.filter((m) => {
    const join = new Date(m.joinDate);
    return join.getFullYear() < year || (join.getFullYear() === year && join.getMonth() + 1 <= month);
  });

  const memberIds = eligibleMembers.map((m) => m._id);
  const contributions = await Contribution.find({
    memberId: { $in: memberIds },
    month,
    year,
  }).lean<IContribution[]>();

  const contribMap = new Map(contributions.map((c) => [c.memberId.toString(), c]));

  const rows = eligibleMembers.map((m) => {
    const contrib = contribMap.get(m._id.toString());
    return {
      member: m,
      contribution: contrib ?? null,
      status: contrib?.status ?? "UNPAID",
    };
  });

  const paidCount = rows.filter((r) => r.status === "PAID").length;
  const unpaidCount = rows.filter((r) => r.status === "UNPAID").length;

  return NextResponse.json({
    rows,
    summary: {
      month,
      year,
      monthlyFee,
      totalEligible: eligibleMembers.length,
      paidCount,
      unpaidCount,
      totalCollected: paidCount * monthlyFee,
      totalExpected: eligibleMembers.length * monthlyFee,
    },
  });
}
