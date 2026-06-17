import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import type { IMember } from "@/models/Member";
import Contribution from "@/models/Contribution";
import type { IContribution } from "@/models/Contribution";
import Settings from "@/models/Settings";
import type { ISettings } from "@/models/Settings";
import { formatCurrency, formatMonth, calculateExpectedPayment } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default async function MemberContributions() {
  const session = await auth();
  await connectDB();

  const [member, settings] = await Promise.all([
    Member.findById(session!.user.id).lean<IMember>(),
    Settings.findOne().lean<ISettings>(),
  ]);

  if (!member) return <div>Member not found</div>;

  const monthlyFee = settings?.monthlyFee ?? 100;

  const contributions = await Contribution.find({ memberId: session!.user.id })
    .sort({ year: -1, month: -1 })
    .lean<IContribution[]>();

  const totalPaid = contributions.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amount, 0);
  const totalExpected = calculateExpectedPayment(member.joinDate, monthlyFee);
  const outstanding = Math.max(0, totalExpected - totalPaid);
  const paidCount = contributions.filter((c) => c.status === "PAID").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payment History</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Expected</p>
            <p className="text-xl font-bold">{formatCurrency(totalExpected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className={`text-xl font-bold ${outstanding > 0 ? "text-orange-600" : "text-green-600"}`}>
              {formatCurrency(outstanding)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Months Paid</p>
            <p className="text-xl font-bold">{paidCount} / {contributions.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Payments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contributions.map((c) => (
                <TableRow key={String(c._id)}>
                  <TableCell className="font-medium">{formatMonth(c.month, c.year)}</TableCell>
                  <TableCell>{formatCurrency(c.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "PAID" ? "success" : "warning"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {c.recordedAt ? format(new Date(c.recordedAt), "MMM d, yyyy") : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {contributions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No payment records yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
