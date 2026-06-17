import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import type { IMember } from "@/models/Member";
import Contribution from "@/models/Contribution";
import type { IContribution } from "@/models/Contribution";
import Giveaway from "@/models/Giveaway";
import type { IGiveaway, IGiveawayRecipient } from "@/models/Giveaway";
import Settings from "@/models/Settings";
import type { ISettings } from "@/models/Settings";
import { calculateOutstanding } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "member") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const memberId = session.user.id;

  const [member, settings] = await Promise.all([
    Member.findById(memberId).lean<IMember>(),
    Settings.findOne().lean<ISettings>(),
  ]);

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const monthlyFee = settings?.monthlyFee ?? 100;

  const [contributions, giveaways, totalActiveMembers] = await Promise.all([
    Contribution.find({ memberId }).sort({ year: -1, month: -1 }).lean<IContribution[]>(),
    Giveaway.find({ "recipients.memberId": memberId, status: "DISTRIBUTED" }).lean<IGiveaway[]>(),
    Member.countDocuments({ status: "ACTIVE" }),
  ]);

  const totalPaid = contributions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0);
  const prizesReceived = giveaways.reduce((s, g) => {
    const r = g.recipients.find((r: IGiveawayRecipient) => r.memberId.toString() === memberId);
    return r ? s + 1 : s;
  }, 0);
  const outstanding = calculateOutstanding(member.joinDate, monthlyFee, totalPaid);

  const [communityCollectedAgg, communityGiveawayCount] = await Promise.all([
    Contribution.aggregate([{ $match: { status: "PAID" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Giveaway.countDocuments({ status: "DISTRIBUTED" }),
  ]);

  return NextResponse.json({
    member,
    stats: {
      totalPaid,
      prizesReceived,
      outstanding,
      queuePosition: member.queuePosition,
      monthlyFee,
    },
    contributions: contributions.slice(0, 12),
    giveaways,
    community: {
      communityName: settings?.communityName ?? "Car Community Fund",
      totalMembers: totalActiveMembers,
      totalCollected: communityCollectedAgg[0]?.total ?? 0,
      totalDistributed: communityGiveawayCount,
    },
  });
}
