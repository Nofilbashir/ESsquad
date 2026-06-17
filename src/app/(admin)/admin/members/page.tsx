import { connectDB } from "@/lib/db";
import Member, { IMember } from "@/models/Member";
import Contribution from "@/models/Contribution";
import Settings, { ISettings } from "@/models/Settings";
import { calculateOutstanding, formatCurrency } from "@/lib/utils";
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
import { Button } from "@/components/ui/button";
import AddMemberDialog from "./AddMemberDialog";
import mongoose from "mongoose";

interface SearchParams {
  search?: string;
  status?: string;
}

async function getMembersData(search?: string, status?: string) {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (status && status !== "ALL") query.status = status;
  if (search) query.name = { $regex: search, $options: "i" };

  const [memberDocs, settingsDoc] = await Promise.all([
    Member.find(query).sort({ queuePosition: 1, createdAt: 1 }).lean<IMember[]>(),
    Settings.findOne().lean<ISettings>(),
  ]);

  const monthlyFee = settingsDoc?.monthlyFee ?? 100;
  const memberIds = memberDocs.map((m) => m._id);

  const paidAgg = await Contribution.aggregate([
    { $match: { memberId: { $in: memberIds }, status: "PAID" } },
    { $group: { _id: "$memberId", totalPaid: { $sum: "$amount" } } },
  ]);

  const paidMap = new Map(paidAgg.map((a) => [a._id.toString(), a.totalPaid as number]));

  return memberDocs.map((m) => {
    const id = (m._id as mongoose.Types.ObjectId).toString();
    const totalPaid = paidMap.get(id) ?? 0;
    const outstanding = calculateOutstanding(m.joinDate, monthlyFee, totalPaid);
    return { ...m, _id: id, totalPaid, outstanding };
  });
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const status = params.status ?? "ALL";

  const members = await getMembersData(search || undefined, status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground text-sm">
            {members.length} member{members.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <AddMemberDialog />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form method="GET" className="flex flex-col sm:flex-row gap-3 flex-1">
          <input type="hidden" name="status" value={status} />
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by name..."
            className="flex h-9 w-full sm:max-w-xs rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex gap-2">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
            <Link
              key={s}
              href={`/admin/members?status=${s}${search ? `&search=${search}` : ""}`}
              className={`h-9 px-3 rounded-md text-sm font-medium transition-colors flex items-center border ${
                status === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-input hover:bg-accent"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Queue #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Join Date</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member._id}>
                  <TableCell className="font-medium">
                    {member.queuePosition !== null ? (
                      <span className="text-sm font-semibold">#{member.queuePosition}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground md:hidden">{member.phone}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {member.phone}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {new Date(member.joinDate).toLocaleDateString("en-PK", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatCurrency(member.totalPaid)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        member.outstanding > 0
                          ? "text-sm font-semibold text-red-600 dark:text-red-400"
                          : "text-sm text-muted-foreground"
                      }
                    >
                      {member.outstanding > 0
                        ? formatCurrency(member.outstanding)
                        : "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === "ACTIVE" ? "success" : "secondary"}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/members/${member._id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
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
