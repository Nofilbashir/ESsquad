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
import { calculateOutstanding, formatCurrency, formatMonth, ordinalSuffix } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, CreditCard, Gift, ListOrdered, CheckCircle, AlertCircle } from "lucide-react";

async function getMemberData(memberId: string) {
  await connectDB();

  const [member, settings] = await Promise.all([
    Member.findById(memberId).lean<IMember>(),
    Settings.findOne().lean<ISettings>(),
  ]);

  if (!member) return null;

  const monthlyFee = settings?.monthlyFee ?? 100;

  const [contributions, giveaways, totalActiveMembers] = await Promise.all([
    Contribution.find({ memberId }).sort({ year: -1, month: -1 }).limit(6).lean<IContribution[]>(),
    Giveaway.find({ "recipients.memberId": memberId, status: "DISTRIBUTED" })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean<IGiveaway[]>(),
    Member.countDocuments({ status: "ACTIVE" }),
  ]);

  const totalPaid = await Contribution.aggregate([
    { $match: { memberId: member._id, status: "PAID" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const totalReceived = giveaways.reduce((s, g) => {
    const r = g.recipients.find((r: IGiveawayRecipient) => r.memberId.toString() === memberId);
    return s + (r?.itemValue ?? 0);
  }, 0);

  const paid = totalPaid[0]?.total ?? 0;
  const outstanding = calculateOutstanding(member.joinDate, monthlyFee, paid);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const thisMonthContrib = contributions.find((c) => c.month === currentMonth && c.year === currentYear);

  return {
    member,
    stats: { totalPaid: paid, totalReceived, outstanding, monthlyFee },
    recentContributions: contributions,
    recentGiveaways: giveaways,
    thisMonthStatus: thisMonthContrib?.status ?? "UNPAID",
    currentMonth,
    currentYear,
    totalActiveMembers,
    communityName: settings?.communityName ?? "Car Community Fund",
  };
}

export default async function MemberDashboard() {
  const session = await auth();
  const data = await getMemberData(session!.user.id);

  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">Member not found.</div>;
  }

  const { member, stats, recentContributions, recentGiveaways, thisMonthStatus, currentMonth, currentYear } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{member.name}</h1>
        <p className="text-muted-foreground">{data.communityName}</p>
      </div>

      {/* This month status banner */}
      <div className={`rounded-lg p-4 flex items-center gap-3 ${thisMonthStatus === "PAID" ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300" : "bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300"}`}>
        {thisMonthStatus === "PAID" ? (
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
        )}
        <div>
          <p className="font-medium text-sm">
            {formatMonth(currentMonth, currentYear)} payment:{" "}
            {thisMonthStatus === "PAID" ? "Paid ✓" : "Not paid yet"}
          </p>
          {thisMonthStatus === "UNPAID" && (
            <p className="text-xs opacity-75">Contact admin once you have paid</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <ListOrdered className="h-3.5 w-3.5" /> Queue Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {member.queuePosition ? ordinalSuffix(member.queuePosition) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">of {data.totalActiveMembers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</p>
            <p className="text-xs text-muted-foreground">{stats.monthlyFee}/mo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Gift className="h-3.5 w-3.5" /> Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalReceived)}</p>
            <p className="text-xs text-muted-foreground">from giveaways</p>
          </CardContent>
        </Card>

        <Card className={stats.outstanding > 0 ? "border-orange-200 dark:border-orange-800" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" /> Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stats.outstanding > 0 ? "text-orange-600" : "text-green-600"}`}>
              {formatCurrency(stats.outstanding)}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.outstanding === 0 ? "All clear!" : "pending"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Recent payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentContributions.map((c) => (
                <div key={String(c._id)} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <p className="text-sm">{formatMonth(c.month, c.year)}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{formatCurrency(c.amount)}</span>
                    <Badge variant={c.status === "PAID" ? "success" : "warning"} className="text-xs">
                      {c.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {recentContributions.length === 0 && (
                <p className="text-sm text-muted-foreground">No payment records yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Giveaways received */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Giveaways Received</CardTitle>
          </CardHeader>
          <CardContent>
            {recentGiveaways.length === 0 ? (
              <p className="text-sm text-muted-foreground">No giveaways received yet</p>
            ) : (
              <div className="space-y-2">
                {recentGiveaways.map((g) => {
                  const myPortion = g.recipients.find((r: IGiveawayRecipient) => r.memberId.toString() === session!.user.id);
                  return (
                    <div key={String(g._id)} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{g.title}</p>
                        <p className="text-xs text-muted-foreground">{formatMonth(g.month, g.year)}</p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium">{myPortion?.itemName ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
