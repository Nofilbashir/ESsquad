import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import type { IMember } from "@/models/Member";
import Contribution from "@/models/Contribution";
import Giveaway from "@/models/Giveaway";
import type { IGiveaway } from "@/models/Giveaway";
import Settings from "@/models/Settings";
import type { ISettings } from "@/models/Settings";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const [settings, totalMembers, activeMembers] = await Promise.all([
    Settings.findOne().lean<ISettings>(),
    Member.countDocuments(),
    Member.countDocuments({ status: "ACTIVE" }),
  ]);

  const monthlyFee = settings?.monthlyFee ?? 100;

  const [totalCollectedAgg, totalDistributedAgg] = await Promise.all([
    Contribution.aggregate([
      { $match: { status: "PAID" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Giveaway.aggregate([
      { $match: { status: "DISTRIBUTED" } },
      { $group: { _id: null, total: { $sum: "$totalPool" } } },
    ]),
  ]);

  const totalCollected = totalCollectedAgg[0]?.total ?? 0;
  const totalDistributed = totalDistributedAgg[0]?.total ?? 0;
  const currentBalance = totalCollected - totalDistributed;

  // Expected monthly collection
  const expectedMonthly = activeMembers * monthlyFee;

  // Next recipients in queue
  const nextRecipients = await Member.find({ status: "ACTIVE", queuePosition: { $ne: null } })
    .sort({ queuePosition: 1 })
    .limit(5)
    .select("name phone queuePosition")
    .lean<IMember[]>();

  // Unpaid members this month
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const unpaidThisMonth = await Contribution.find({
    month: currentMonth,
    year: currentYear,
    status: "UNPAID",
  })
    .populate("memberId", "name phone")
    .lean();

  // Recent payments
  const recentPayments = await Contribution.find({ status: "PAID" })
    .sort({ recordedAt: -1 })
    .limit(10)
    .populate("memberId", "name")
    .lean();

  // Recent giveaways
  const recentGiveaways = await Giveaway.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .lean<IGiveaway[]>();

  return NextResponse.json({
    stats: {
      totalMembers,
      activeMembers,
      expectedMonthly,
      totalCollected,
      totalDistributed,
      currentBalance,
      monthlyFee,
      communityName: settings?.communityName ?? "Car Community Fund",
    },
    nextRecipients,
    unpaidThisMonth,
    recentPayments,
    recentGiveaways,
  });
}
