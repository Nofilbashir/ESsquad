import { connectDB } from "@/lib/db";
import Member, { IMember } from "@/models/Member";
import Giveaway, { IGiveaway } from "@/models/Giveaway";
import { formatMonth } from "@/lib/utils";
import Link from "next/link";
import SkipButton from "./SkipButton";
import mongoose from "mongoose";
import { Package } from "lucide-react";

interface QueueMember {
  _id: string;
  name: string;
  phone: string;
  joinDate: Date;
  queuePosition: number;
  hasReceivedGiveaway: boolean;
  lastPrize: { itemName: string; giveawayTitle: string; month: number; year: number } | null;
}

async function getQueueData(): Promise<{ pending: QueueMember[]; received: QueueMember[] }> {
  await connectDB();

  const memberDocs = await Member.find({ status: "ACTIVE", queuePosition: { $ne: null } })
    .sort({ queuePosition: 1 })
    .lean<IMember[]>();

  // Fetch all distributed giveaways, most recent first
  const giveaways = await Giveaway.find({ status: "DISTRIBUTED" })
    .sort({ createdAt: -1 })
    .lean<IGiveaway[]>();

  // Build map: memberId → most recent prize they received
  const lastPrizeMap = new Map<string, { itemName: string; giveawayTitle: string; month: number; year: number }>();
  for (const g of giveaways) {
    for (const r of g.recipients) {
      const mid = r.memberId.toString();
      if (!lastPrizeMap.has(mid)) {
        lastPrizeMap.set(mid, {
          itemName: r.itemName,
          giveawayTitle: g.title,
          month: g.month,
          year: g.year,
        });
      }
    }
  }

  const receivedSet = new Set(lastPrizeMap.keys());

  const members: QueueMember[] = memberDocs.map((m) => {
    const mid = (m._id as mongoose.Types.ObjectId).toString();
    return {
      _id: mid,
      name: m.name,
      phone: m.phone,
      joinDate: m.joinDate,
      queuePosition: m.queuePosition as number,
      hasReceivedGiveaway: receivedSet.has(mid),
      lastPrize: lastPrizeMap.get(mid) ?? null,
    };
  });

  // Split into pending (not yet received) and received — each sorted by queuePosition
  const pending = members.filter((m) => !m.hasReceivedGiveaway);
  const received = members.filter((m) => m.hasReceivedGiveaway);

  return { pending, received };
}

function PositionBubble({ pos, variant }: { pos: number; variant: "primary" | "blue" | "lightblue" | "muted" }) {
  const cls = {
    primary: "bg-primary text-primary-foreground",
    blue: "bg-blue-100 text-blue-600",
    lightblue: "bg-blue-50 text-blue-400",
    muted: "bg-muted text-muted-foreground",
  }[variant];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${cls}`}>
      {pos}
    </div>
  );
}

export default async function QueuePage() {
  const { pending, received } = await getQueueData();
  const total = pending.length + received.length;

  // Spotlight: top 3 from pending; if fewer than 3, fill from received
  const spotlight = [...pending, ...received].slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Queue Management</h1>
        <p className="text-muted-foreground text-sm">
          {total} active member{total !== 1 ? "s" : ""} ·{" "}
          <span className="text-foreground font-medium">{pending.length} yet to receive</span>
          {received.length > 0 && `, ${received.length} waiting for next cycle`}
        </p>
      </div>

      {/* Spotlight cards */}
      {spotlight.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {spotlight.map((m, i) => (
            <div key={m._id} className="relative rounded-xl border bg-card overflow-hidden flex items-center gap-3 p-5">
              {i === 0 && !m.hasReceivedGiveaway && (
                <div className="absolute top-0 inset-x-0 h-[3px] bg-primary rounded-t-xl" />
              )}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                i === 0 && !m.hasReceivedGiveaway
                  ? "bg-primary text-primary-foreground"
                  : i === 1
                  ? "bg-blue-100 text-blue-600"
                  : "bg-blue-50 text-blue-400"
              }`}>
                {m.queuePosition}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/members/${m._id}`} className="font-semibold text-sm hover:underline truncate block">
                  {m.name}
                </Link>
                <p className="text-xs text-muted-foreground">{m.phone}</p>
              </div>
              {i === 0 && !m.hasReceivedGiveaway && (
                <span className="text-xs font-semibold text-primary flex-shrink-0">Up next</span>
              )}
              {m.hasReceivedGiveaway && (
                <span className="text-xs text-muted-foreground flex-shrink-0">Cycle 2</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending section */}
      {pending.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-muted/30">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-semibold">Yet to receive — {pending.length} member{pending.length !== 1 ? "s" : ""}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20">Pos</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Member</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Phone</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((m, i) => (
                <tr key={m._id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors`}>
                  <td className="px-5 py-3">
                    <PositionBubble
                      pos={m.queuePosition}
                      variant={i === 0 ? "primary" : i === 1 ? "blue" : i === 2 ? "lightblue" : "muted"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${m._id}`} className="font-medium hover:underline">{m.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{m.phone}</td>
                  <td className="px-5 py-3 text-right">
                    <SkipButton memberId={m._id} memberName={m.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Received section */}
      {received.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b bg-muted/30">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold">Already received — waiting for next cycle</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20">Pos</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Member</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Prize received</th>
                <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {received.map((m) => (
                <tr key={m._id} className="border-b last:border-0 hover:bg-muted/20 transition-colors opacity-70">
                  <td className="px-5 py-3">
                    <PositionBubble pos={m.queuePosition} variant="muted" />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${m._id}`} className="font-medium hover:underline">{m.name}</Link>
                    <p className="text-xs text-muted-foreground">{m.phone}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {m.lastPrize ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium ring-1 ring-emerald-100">
                          <Package className="h-3 w-3" />
                          {m.lastPrize.itemName}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatMonth(m.lastPrize.month, m.lastPrize.year)}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <SkipButton memberId={m._id} memberName={m.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total === 0 && (
        <div className="rounded-xl border bg-card flex flex-col items-center justify-center py-16 text-center">
          <p className="font-semibold text-foreground">No members in queue</p>
          <p className="text-sm text-muted-foreground mt-1">Add active members with a queue position to see them here</p>
        </div>
      )}
    </div>
  );
}
