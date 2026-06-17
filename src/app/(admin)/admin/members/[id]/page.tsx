import { connectDB } from "@/lib/db";
import Member, { IMember } from "@/models/Member";
import Contribution, { IContribution } from "@/models/Contribution";
import Giveaway, { IGiveaway } from "@/models/Giveaway";
import Settings, { ISettings } from "@/models/Settings";
import { calculateOutstanding, formatCurrency, formatMonth, getMonthRange } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, User, Phone, Mail, CalendarDays, Hash } from "lucide-react";
import EditMemberDialog from "./EditMemberDialog";
import ResetPasswordDialog from "./ResetPasswordDialog";
import mongoose from "mongoose";

async function getMemberData(id: string) {
  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const [memberDoc, settingsDoc] = await Promise.all([
    Member.findById(id).lean<IMember>(),
    Settings.findOne().lean<ISettings>(),
  ]);

  if (!memberDoc) return null;

  const monthlyFee = settingsDoc?.monthlyFee ?? 100;
  const months = getMonthRange(memberDoc.joinDate);

  const [contributionDocs, giveawayDocs] = await Promise.all([
    Contribution.find({ memberId: id }).sort({ year: -1, month: -1 }).lean<IContribution[]>(),
    Giveaway.find({
      "recipients.memberId": id,
      status: "DISTRIBUTED",
    })
      .sort({ year: -1, month: -1 })
      .lean<IGiveaway[]>(),
  ]);

  const totalPaid = contributionDocs
    .filter((c) => c.status === "PAID")
    .reduce((s, c) => s + c.amount, 0);

  const totalReceived = giveawayDocs.reduce((s, g) => {
    const r = g.recipients.find((rec) => rec.memberId.toString() === id);
    return s + (r?.itemValue ?? 0);
  }, 0);

  const outstanding = calculateOutstanding(memberDoc.joinDate, monthlyFee, totalPaid);

  return {
    member: {
      _id: (memberDoc._id as mongoose.Types.ObjectId).toString(),
      name: memberDoc.name,
      phone: memberDoc.phone,
      email: memberDoc.email,
      queuePosition: memberDoc.queuePosition,
      joinDate: memberDoc.joinDate,
      status: memberDoc.status,
    },
    contributions: contributionDocs.map((c) => ({
      _id: (c._id as mongoose.Types.ObjectId).toString(),
      month: c.month,
      year: c.year,
      amount: c.amount,
      status: c.status,
      recordedAt: c.recordedAt,
    })),
    giveaways: giveawayDocs.map((g) => ({
      _id: (g._id as mongoose.Types.ObjectId).toString(),
      month: g.month,
      year: g.year,
      title: g.title,
      recipientItem:
        g.recipients.find((r) => r.memberId.toString() === id)?.itemName ?? "",
    })),
    stats: {
      totalPaid,
      totalReceived,
      outstanding,
      monthsTracked: months.length,
    },
  };
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getMemberData(id);

  if (!data) notFound();

  const { member, contributions, giveaways, stats } = data;

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/members">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Members
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{member.name}</h1>
            <Badge
              variant={member.status === "ACTIVE" ? "success" : "secondary"}
              className="mt-1"
            >
              {member.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <EditMemberDialog member={member} />
          <ResetPasswordDialog memberId={member._id} memberName={member.name} />
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Name</p>
                <p className="font-medium">{member.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Phone</p>
                <p className="font-medium">{member.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Queue Position</p>
                <p className="font-medium">
                  {member.queuePosition !== null ? `#${member.queuePosition}` : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Join Date</p>
                <p className="font-medium">
                  {new Date(member.joinDate).toLocaleDateString("en-PK", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(stats.totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Received</p>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(stats.totalReceived)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p
              className={`text-xl font-bold ${
                stats.outstanding > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              }`}
            >
              {stats.outstanding > 0 ? formatCurrency(stats.outstanding) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Months Tracked</p>
            <p className="text-xl font-bold">{stats.monthsTracked}</p>
          </CardContent>
        </Card>
      </div>

      {/* Contribution history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contribution History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month / Year</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contributions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    No contribution records
                  </TableCell>
                </TableRow>
              ) : (
                contributions.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">
                      {formatMonth(c.month, c.year)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(c.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "PAID" ? "success" : "warning"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {c.recordedAt
                        ? new Date(c.recordedAt).toLocaleDateString("en-PK", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Giveaway history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Giveaway History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month / Year</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Amount Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giveaways.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-8"
                  >
                    No giveaways received
                  </TableCell>
                </TableRow>
              ) : (
                giveaways.map((g) => (
                  <TableRow key={g._id}>
                    <TableCell className="font-medium">
                      {formatMonth(g.month, g.year)}
                    </TableCell>
                    <TableCell>{g.title}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                        {g.recipientItem || "—"}
                      </span>
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
