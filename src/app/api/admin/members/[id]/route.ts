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
import { calculateOutstanding, getMonthRange } from "@/lib/utils";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const [member, settings] = await Promise.all([
    Member.findById(id).lean<IMember>(),
    Settings.findOne().lean<ISettings>(),
  ]);

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const monthlyFee = settings?.monthlyFee ?? 100;
  const months = getMonthRange(member.joinDate);

  const [contributions, giveaways] = await Promise.all([
    Contribution.find({ memberId: id }).sort({ year: -1, month: -1 }).lean<IContribution[]>(),
    Giveaway.find({
      "recipients.memberId": id,
      status: "DISTRIBUTED",
    }).lean<IGiveaway[]>(),
  ]);

  const totalPaid = contributions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0);
  const totalReceived = giveaways.reduce((s, g) => {
    const r = g.recipients.find((r: IGiveawayRecipient) => r.memberId.toString() === id);
    return s + (r?.itemValue ?? 0);
  }, 0);
  const outstanding = calculateOutstanding(member.joinDate, monthlyFee, totalPaid);

  return NextResponse.json({
    member,
    contributions,
    giveaways,
    stats: { totalPaid, totalReceived, outstanding, monthsTracked: months.length },
  });
}
