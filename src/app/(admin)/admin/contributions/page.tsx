import { connectDB } from "@/lib/db";
import Member, { IMember } from "@/models/Member";
import Contribution, { IContribution } from "@/models/Contribution";
import Settings, { ISettings } from "@/models/Settings";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ContributionToggle from "./ContributionToggle";
import mongoose from "mongoose";

interface SearchParams {
  month?: string;
  year?: string;
}

async function getContributionsData(month: number, year: number) {
  await connectDB();

  const settingsDoc = await Settings.findOne().lean<ISettings>();
  const monthlyFee = settingsDoc?.monthlyFee ?? 100;

  const allMemberDocs = await Member.find({ status: "ACTIVE" })
    .sort({ queuePosition: 1, createdAt: 1 })
    .lean<IMember[]>();

  const eligibleMembers = allMemberDocs.filter((m) => {
    const join = new Date(m.joinDate);
    return (
      join.getFullYear() < year ||
      (join.getFullYear() === year && join.getMonth() + 1 <= month)
    );
  });

  const memberIds = eligibleMembers.map((m) => m._id);

  const contributionDocs = await Contribution.find({
    memberId: { $in: memberIds },
    month,
    year,
  }).lean<IContribution[]>();

  const contribMap = new Map(
    contributionDocs.map((c) => [c.memberId.toString(), c])
  );

  const rows = eligibleMembers.map((m) => {
    const mid = (m._id as mongoose.Types.ObjectId).toString();
    const c = contribMap.get(mid);
    return {
      member: {
        _id: mid,
        name: m.name,
        phone: m.phone,
        queuePosition: m.queuePosition,
      },
      contribution: c
        ? {
            _id: (c._id as mongoose.Types.ObjectId).toString(),
            status: c.status,
            amount: c.amount,
            recordedAt: c.recordedAt,
          }
        : null,
    };
  });

  const paidCount = rows.filter((r) => r.contribution?.status === "PAID").length;
  const unpaidCount = rows.filter(
    (r) => !r.contribution || r.contribution.status === "UNPAID"
  ).length;
  const totalCollected = contributionDocs
    .filter((c) => c.status === "PAID")
    .reduce((s, c) => s + c.amount, 0);
  const totalExpected = eligibleMembers.length * monthlyFee;

  return {
    rows,
    stats: {
      eligible: eligibleMembers.length,
      paid: paidCount,
      unpaid: unpaidCount,
      totalCollected,
      totalExpected,
    },
    monthlyFee,
  };
}

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
  const year = params.year ? parseInt(params.year) : now.getFullYear();

  const data = await getContributionsData(month, year);

  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) { prevMonth = 12; prevYear -= 1; }

  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contributions</h1>
          <p className="text-muted-foreground text-sm">Track monthly payments</p>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-4">
        <Link href={`/admin/contributions?month=${prevMonth}&year=${prevYear}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-lg font-semibold min-w-36 text-center">
          {formatMonth(month, year)}
        </span>
        <Link href={`/admin/contributions?month=${nextMonth}&year=${nextYear}`}>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Eligible</p>
            <p className="text-2xl font-bold">{data.stats.eligible}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.stats.paid}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unpaid</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {data.stats.unpaid}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Collected</p>
            <p className="text-xl font-bold">{formatCurrency(data.stats.totalCollected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Expected</p>
            <p className="text-xl font-bold">{formatCurrency(data.stats.totalExpected)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Contributions table */}
      <div className="rounded-xl border bg-card shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Queue #</TableHead>
              <TableHead>Member Name</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Recorded</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-10"
                >
                  No eligible members for this month
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map(({ member, contribution }) => (
                <TableRow key={member._id}>
                  <TableCell className="font-medium">
                    {member.queuePosition !== null ? (
                      <span>#{member.queuePosition}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/members/${member._id}`}
                      className="font-medium hover:underline"
                    >
                      {member.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {member.phone}
                  </TableCell>
                  <TableCell>
                    {contribution?.status === "PAID" ? (
                      <Badge variant="success">PAID</Badge>
                    ) : (
                      <Badge variant="warning">UNPAID</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {contribution?.recordedAt
                      ? new Date(contribution.recordedAt).toLocaleDateString(
                          "en-PK",
                          { day: "numeric", month: "short", year: "numeric" }
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <ContributionToggle
                      memberId={member._id}
                      month={month}
                      year={year}
                      currentStatus={contribution?.status ?? "UNPAID"}
                    />
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
