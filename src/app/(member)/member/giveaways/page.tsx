import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Giveaway from "@/models/Giveaway";
import type { IGiveaway, IGiveawayRecipient } from "@/models/Giveaway";
import { formatCurrency, formatMonth } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gift } from "lucide-react";
import { format } from "date-fns";

export default async function MemberGiveaways() {
  const session = await auth();
  await connectDB();

  const memberId = session!.user.id;

  const giveaways = await Giveaway.find({
    "recipients.memberId": memberId,
    status: "DISTRIBUTED",
  })
    .sort({ createdAt: -1 })
    .lean<IGiveaway[]>();

  const totalReceived = giveaways.reduce((s, g) => {
    const r = g.recipients.find((r: IGiveawayRecipient) => r.memberId.toString() === memberId);
    return s + (r?.itemValue ?? 0);
  }, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Giveaway History</h1>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Received</p>
              <p className="text-2xl font-bold">{formatCurrency(totalReceived)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Giveaways</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Prize</TableHead>
                <TableHead>Distributed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giveaways.map((g) => {
                const myPortion = g.recipients.find((r: IGiveawayRecipient) => r.memberId.toString() === memberId);
                return (
                  <TableRow key={String(g._id)}>
                    <TableCell className="font-medium">{g.title}</TableCell>
                    <TableCell>{formatMonth(g.month, g.year)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                        {myPortion?.itemName ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {g.distributedAt ? format(new Date(g.distributedAt), "MMM d, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {giveaways.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No giveaways received yet
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
