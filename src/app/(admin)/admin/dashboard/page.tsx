import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import Contribution from "@/models/Contribution";
import Giveaway from "@/models/Giveaway";
import Settings from "@/models/Settings";
import { auth } from "@/lib/auth";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Wallet,
  TrendingUp,
  AlertCircle,
  ListOrdered,
  Gift,
  CheckCircle2,
  ArrowRight,
  CalendarDays,
  Clock,
} from "lucide-react";
import Link from "next/link";

async function getDashboardData() {
  await connectDB();

  const settings = await Settings.findOne().lean() as { monthlyFee?: number; communityName?: string } | null;
  const monthlyFee = settings?.monthlyFee ?? 100;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [totalMembers, activeMemberCount] = await Promise.all([
    Member.countDocuments(),
    Member.countDocuments({ status: "ACTIVE" }),
  ]);

  const [totalCollectedAgg, giveawaysDoneCount] = await Promise.all([
    Contribution.aggregate([{ $match: { status: "PAID" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Giveaway.countDocuments({ status: "DISTRIBUTED" }),
  ]);

  const totalCollected: number = totalCollectedAgg[0]?.total ?? 0;
  const totalDistributed: number = giveawaysDoneCount;
  const currentBalance = totalCollected;

  // Unpaid = active members eligible this month who have no PAID contribution record
  const activeMembers = (await Member.find({ status: "ACTIVE" })
    .select("_id name phone joinDate")
    .lean()) as unknown as Array<{ _id: unknown; name: string; phone: string; joinDate: Date }>;

  const eligibleMembers = activeMembers.filter((m) => {
    const join = new Date(m.joinDate);
    return (
      join.getFullYear() < currentYear ||
      (join.getFullYear() === currentYear && join.getMonth() + 1 <= currentMonth)
    );
  });

  const eligibleIds = eligibleMembers.map((m) => m._id);

  const paidThisMonth = (await Contribution.find({
    memberId: { $in: eligibleIds },
    month: currentMonth,
    year: currentYear,
    status: "PAID",
  })
    .select("memberId")
    .lean()) as unknown as Array<{ memberId: unknown }>;

  const paidSet = new Set(paidThisMonth.map((c) => String(c.memberId)));

  const allUnpaid = eligibleMembers.filter((m) => !paidSet.has(String(m._id)));
  const unpaidThisMonth = allUnpaid
    .slice(0, 8)
    .map((m) => ({ _id: m._id, memberId: { name: m.name, phone: m.phone }, amount: monthlyFee }));
  const unpaidCount = allUnpaid.length;

  const recentPayments = (await Contribution.find({ status: "PAID" })
    .populate("memberId", "name")
    .sort({ recordedAt: -1 })
    .limit(6)
    .lean()) as unknown as Array<{ _id: unknown; memberId: { name: string }; month: number; year: number; amount: number }>;

  const nextRecipients = (await Member.find({ status: "ACTIVE", queuePosition: { $ne: null } })
    .sort({ queuePosition: 1 })
    .limit(5)
    .lean()) as unknown as Array<{ _id: unknown; name: string; phone: string; queuePosition: number }>;

  const recentGiveaways = (await Giveaway.find()
    .sort({ createdAt: -1 })
    .limit(4)
    .lean()) as unknown as Array<{ _id: unknown; title: string; month: number; year: number; totalPool: number; status: string }>;

  return {
    stats: { totalMembers, activeMembers: activeMemberCount, totalCollected, totalDistributed, currentBalance, monthlyFee, currentMonth, currentYear },
    unpaidThisMonth,
    unpaidCount,
    recentPayments,
    nextRecipients,
    recentGiveaways,
    communityName: settings?.communityName ?? "Car Community Fund",
  };
}

function InitialAvatar({ name, color }: { name: string; color: string }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default async function AdminDashboard() {
  const session = await auth();
  const data = await getDashboardData();
  const { stats } = data;

  const firstName = session?.user?.name?.split(" ")[0] ?? "Admin";

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{data.communityName} · Admin Overview</p>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-card border rounded-lg px-3 py-2 flex-shrink-0">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatMonth(stats.currentMonth, stats.currentYear)}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Members */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-blue-500 rounded-t-xl" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Members</p>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="text-4xl font-extrabold tracking-tight tabular-nums text-foreground">{stats.activeMembers}</p>
            <p className="text-xs text-muted-foreground mt-2">{stats.totalMembers} enrolled total</p>
          </CardContent>
        </Card>

        {/* Collected */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-violet-500 rounded-t-xl" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Collected</p>
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-violet-500" />
              </div>
            </div>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums text-foreground leading-tight">{formatCurrency(stats.totalCollected)}</p>
            <p className="text-xs text-muted-foreground mt-2">All time</p>
          </CardContent>
        </Card>

        {/* Distributed */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-amber-400 rounded-t-xl" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Giveaways</p>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Gift className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <p className="text-4xl font-extrabold tracking-tight tabular-nums text-foreground">{stats.totalDistributed}</p>
            <p className="text-xs text-muted-foreground mt-2">Distributed</p>
          </CardContent>
        </Card>

        {/* Balance */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[3px] bg-emerald-500 rounded-t-xl" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-extrabold tracking-tight tabular-nums text-emerald-600 leading-tight">{formatCurrency(stats.currentBalance)}</p>
            <p className="text-xs text-muted-foreground mt-2">Total collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Middle row */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Unpaid this month */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-sm">Unpaid — {formatMonth(stats.currentMonth, stats.currentYear)}</span>
              {data.unpaidCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                  {data.unpaidCount}
                </span>
              )}
            </div>
            <Link href="/admin/contributions" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <CardContent className="p-0">
            {data.unpaidThisMonth.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="font-semibold text-sm text-foreground">All payments received</p>
                <p className="text-xs text-muted-foreground mt-1">Every member has paid for {formatMonth(stats.currentMonth, stats.currentYear)}</p>
              </div>
            ) : (
              <ul className="max-h-64 overflow-y-auto">
                {data.unpaidThisMonth.map((c, i) => (
                  <li key={String(c._id)} className={`flex items-center justify-between px-6 py-3.5 ${i < data.unpaidThisMonth.length - 1 ? "border-b" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <InitialAvatar name={c.memberId.name} color="bg-amber-100 text-amber-700" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.memberId.name}</p>
                        <p className="text-xs text-muted-foreground">{c.memberId.phone}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-amber-600 tabular-nums flex-shrink-0 ml-4">{formatCurrency(c.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Queue */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-sm">Next in Queue</span>
            </div>
            <Link href="/admin/queue" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <CardContent className="p-0">
            {data.nextRecipients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ListOrdered className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-semibold text-sm text-foreground">Queue is empty</p>
                <p className="text-xs text-muted-foreground mt-1">No members are in the giveaway queue yet</p>
              </div>
            ) : (
              <ul className="max-h-64 overflow-y-auto">
                {data.nextRecipients.map((m, i) => (
                  <li key={String(m._id)} className={`flex items-center gap-3 px-6 py-3.5 ${i < data.nextRecipients.length - 1 ? "border-b" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {m.queuePosition}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.phone}</p>
                    </div>
                    {i === 0 && (
                      <span className="text-xs font-semibold text-primary flex-shrink-0">Up next</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Recent Payments */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold text-sm">Recent Payments</span>
            </div>
            <Link href="/admin/contributions" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <CardContent className="p-0">
            {data.recentPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-semibold text-sm text-foreground">No payments yet</p>
                <p className="text-xs text-muted-foreground mt-1">Payments will appear here once recorded</p>
              </div>
            ) : (
              <ul>
                {data.recentPayments.map((c, i) => (
                  <li key={String(c._id)} className={`flex items-center justify-between px-6 py-3.5 ${i < data.recentPayments.length - 1 ? "border-b" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <InitialAvatar name={c.memberId.name} color="bg-emerald-100 text-emerald-700" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.memberId.name}</p>
                        <p className="text-xs text-muted-foreground">{formatMonth(c.month, c.year)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 tabular-nums flex-shrink-0 ml-4">{formatCurrency(c.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Giveaways */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-violet-500" />
              <span className="font-semibold text-sm">Recent Giveaways</span>
            </div>
            <Link href="/admin/giveaways" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <CardContent className="p-0">
            {data.recentGiveaways.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Gift className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-semibold text-sm text-foreground">No giveaways yet</p>
                <p className="text-xs text-muted-foreground mt-1">Create your first giveaway to distribute the fund</p>
              </div>
            ) : (
              <ul>
                {data.recentGiveaways.map((g, i) => (
                  <li key={String(g._id)} className={`flex items-center justify-between px-6 py-3.5 ${i < data.recentGiveaways.length - 1 ? "border-b" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${g.status === "DISTRIBUTED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        <Gift className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{g.title}</p>
                        <p className="text-xs text-muted-foreground">{formatMonth(g.month, g.year)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(g.totalPool)}</p>
                      <p className={`text-xs font-medium mt-0.5 ${g.status === "DISTRIBUTED" ? "text-emerald-600" : "text-amber-600"}`}>
                        {g.status === "DISTRIBUTED" ? "Distributed" : "Draft"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
