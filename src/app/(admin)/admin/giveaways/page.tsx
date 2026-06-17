import { connectDB } from "@/lib/db";
import Giveaway, { IGiveaway } from "@/models/Giveaway";
import { formatMonth } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import CreateGiveawayDialog from "./CreateGiveawayDialog";
import GiveawayActions from "./GiveawayActions";
import mongoose from "mongoose";

interface SearchParams {
  filter?: string;
}

async function getGiveawaysData(filter?: string) {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (filter && filter !== "ALL") query.status = filter;

  const docs = await Giveaway.find(query)
    .populate("recipients.memberId", "name")
    .sort({ createdAt: -1 })
    .lean();

  return (docs as unknown as Array<IGiveaway & { _id: mongoose.Types.ObjectId; recipients: Array<{ memberId: { _id: mongoose.Types.ObjectId; name: string } | mongoose.Types.ObjectId; itemName: string; itemValue: number; queuePositionAtTime: number }> }>).map((g) => ({
    _id: g._id.toString(),
    month: g.month,
    year: g.year,
    title: g.title,
    prizes: g.recipients.map((r) => r.itemName),
    winners: g.recipients.map((r) =>
      typeof r.memberId === "object" && "name" in r.memberId
        ? (r.memberId as { name: string }).name
        : "Unknown"
    ),
    status: g.status,
    distributedAt: g.distributedAt,
  }));
}

export default async function GiveawaysPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filter = params.filter ?? "ALL";

  const giveaways = await getGiveawaysData(filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Giveaways</h1>
          <p className="text-muted-foreground text-sm">
            Manage and distribute community prizes
          </p>
        </div>
        <CreateGiveawayDialog />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["ALL", "DRAFT", "DISTRIBUTED"] as const).map((f) => (
          <Link
            key={f}
            href={`/admin/giveaways?filter=${f}`}
            className={`h-9 px-4 rounded-lg text-sm font-medium transition-colors flex items-center border ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-input hover:bg-accent"
            }`}
          >
            {f === "ALL" ? "All" : f === "DRAFT" ? "Draft" : "Distributed"}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Prizes</TableHead>
              <TableHead className="hidden md:table-cell">Winners</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {giveaways.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No giveaways found
                </TableCell>
              </TableRow>
            ) : (
              giveaways.map((g) => (
                <TableRow key={g._id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatMonth(g.month, g.year)}
                  </TableCell>
                  <TableCell className="font-medium">{g.title}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {g.prizes.slice(0, 3).map((item, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-foreground"
                        >
                          {item}
                        </span>
                      ))}
                      {g.prizes.length > 3 && (
                        <span className="text-xs text-muted-foreground self-center">
                          +{g.prizes.length - 3} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {g.winners.slice(0, 2).map((name, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/8 text-xs font-medium text-primary"
                        >
                          {name}
                        </span>
                      ))}
                      {g.winners.length > 2 && (
                        <span className="text-xs text-muted-foreground self-center">
                          +{g.winners.length - 2} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={g.status === "DISTRIBUTED" ? "success" : "secondary"}>
                      {g.status === "DISTRIBUTED" ? "Distributed" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <GiveawayActions giveawayId={g._id} status={g.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
