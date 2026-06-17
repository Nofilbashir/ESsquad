import { connectDB } from "@/lib/db";
import Member, { IMember } from "@/models/Member";
import Contribution from "@/models/Contribution";
import Settings, { ISettings } from "@/models/Settings";
import { calculateOutstanding, formatCurrency, formatMonth, getMonthRange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CollectionChart from "./CollectionChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import mongoose from "mongoose";

async function getReportsData() {
  await connectDB();

  const [settingsDoc, memberDocs] = await Promise.all([
    Settings.findOne().lean<ISettings>(),
    Member.find({ status: "ACTIVE" }).sort({ queuePosition: 1, createdAt: 1 }).lean<IMember[]>(),
  ]);

  const monthlyFee = settingsDoc?.monthlyFee ?? 100;
  const memberIds = memberDocs.map((m) => m._id);

  const allPaid = await Contribution.aggregate([
    { $match: { memberId: { $in: memberIds }, status: "PAID" } },
    { $group: { _id: "$memberId", totalPaid: { $sum: "$amount" } } },
  ]);

  const paidMap = new Map(
    allPaid.map((a) => [a._id.toString(), a.totalPaid as number])
  );

  // Outstanding per member (sorted by highest outstanding first)
  const outstandingRows = memberDocs
    .map((m) => {
      const id = (m._id as mongoose.Types.ObjectId).toString();
      const totalPaid = paidMap.get(id) ?? 0;
      const outstanding = calculateOutstanding(m.joinDate, monthlyFee, totalPaid);
      return {
        _id: id,
        name: m.name,
        phone: m.phone,
        totalPaid,
        outstanding,
        queuePosition: m.queuePosition,
      };
    })
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  // Top contributors (all time, sorted by total paid)
  const topContributors = memberDocs
    .map((m) => ({
      _id: (m._id as mongoose.Types.ObjectId).toString(),
      name: m.name,
      totalPaid: paidMap.get((m._id as mongoose.Types.ObjectId).toString()) ?? 0,
    }))
    .filter((m) => m.totalPaid > 0)
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 10);

  // Monthly collection summary — last 12 months with contribution records
  const allActiveMembers = await Member.find({ status: "ACTIVE" }).lean<IMember[]>();

  const monthGroups = await Contribution.aggregate([
    { $group: { _id: { month: "$month", year: "$year" } } },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: 12 },
  ]);

  const monthSummaries = await Promise.all(
    monthGroups.map(async ({ _id: { month, year } }: { _id: { month: number; year: number } }) => {
      const eligibleMembers = allActiveMembers.filter((m) => {
        const join = new Date(m.joinDate);
        return (
          join.getFullYear() < year ||
          (join.getFullYear() === year && join.getMonth() + 1 <= month)
        );
      });

      const contribAgg = await Contribution.aggregate([
        { $match: { month, year } },
        {
          $group: {
            _id: "$status",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]);

      const paidAgg = contribAgg.find((a: { _id: string }) => a._id === "PAID");
      const collected: number = paidAgg?.total ?? 0;
      const expected = eligibleMembers.length * monthlyFee;

      return {
        month,
        year,
        expected,
        collected,
        deficit: Math.max(0, expected - collected),
        paidCount: paidAgg?.count ?? 0,
        eligibleCount: eligibleMembers.length,
      };
    })
  );

  return { outstandingRows, topContributors, monthSummaries, monthlyFee };
}

export default async function ReportsPage() {
  const data = await getReportsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Financial overview and member analytics
        </p>
      </div>

      {/* Monthly Collection Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Collection</CardTitle>
          <p className="text-xs text-muted-foreground -mt-1">Expected vs collected over the last {data.monthSummaries.length} months</p>
        </CardHeader>
        <CardContent>
          <CollectionChart
            data={[...data.monthSummaries].reverse().map((m) => ({
              label: new Date(m.year, m.month - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
              Expected: m.expected,
              Collected: m.collected,
            }))}
          />
        </CardContent>
      </Card>

      {/* Outstanding payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Outstanding Payments</span>
            {data.outstandingRows.length > 0 && (
              <Badge variant="warning">
                {data.outstandingRows.length} member
                {data.outstandingRows.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Queue #</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.outstandingRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-green-600 dark:text-green-400 py-8"
                  >
                    All members are up to date
                  </TableCell>
                </TableRow>
              ) : (
                data.outstandingRows.map((row) => (
                  <TableRow key={row._id}>
                    <TableCell className="text-muted-foreground">
                      {row.queuePosition !== null ? `#${row.queuePosition}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/members/${row._id}`}
                        className="font-medium hover:underline"
                      >
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {row.phone}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(row.totalPaid)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(row.outstanding)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly collection summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Collection Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Eligible</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Deficit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.monthSummaries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No contribution records found
                  </TableCell>
                </TableRow>
              ) : (
                data.monthSummaries.map((row) => (
                  <TableRow key={`${row.year}-${row.month}`}>
                    <TableCell className="font-medium">
                      {formatMonth(row.month, row.year)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {row.eligibleCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {row.paidCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.expected)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.collected)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.deficit > 0 ? (
                        <span className="text-red-600 dark:text-red-400 font-semibold">
                          {formatCurrency(row.deficit)}
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top contributors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Contributors (All Time)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topContributors.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-8"
                  >
                    No payment records found
                  </TableCell>
                </TableRow>
              ) : (
                data.topContributors.map((member, i) => (
                  <TableRow key={member._id}>
                    <TableCell>
                      <div
                        className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold ${
                          i === 0
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                            : i === 1
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                            : i === 2
                            ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {i + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/members/${member._id}`}
                        className="font-medium hover:underline"
                      >
                        {member.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(member.totalPaid)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
