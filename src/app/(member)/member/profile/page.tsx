import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Member from "@/models/Member";
import type { IMember } from "@/models/Member";
import Settings from "@/models/Settings";
import type { ISettings } from "@/models/Settings";
import { formatCurrency, ordinalSuffix } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Calendar, ListOrdered } from "lucide-react";
import { format } from "date-fns";

export default async function MemberProfile() {
  const session = await auth();
  await connectDB();

  const [member, settings] = await Promise.all([
    Member.findById(session!.user.id).lean<IMember>(),
    Settings.findOne().lean<ISettings>(),
  ]);

  if (!member) return <div>Member not found</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 py-2 border-b">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="font-medium">{member.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2 border-b">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{member.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2 border-b">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2 border-b">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Joined</p>
              <p className="font-medium">{format(new Date(member.joinDate), "MMMM d, yyyy")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2">
            <ListOrdered className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Queue Position</p>
              <p className="font-medium">
                {member.queuePosition ? ordinalSuffix(member.queuePosition) : "Not in queue"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Community Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Community</span>
            <span className="text-sm font-medium">{settings?.communityName ?? "Car Community Fund"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Monthly Contribution</span>
            <span className="text-sm font-medium">{formatCurrency(settings?.monthlyFee ?? 100)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Account Status</span>
            <Badge variant={member.status === "ACTIVE" ? "success" : "secondary"}>
              {member.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground">
        To update your details or reset your password, contact the admin.
      </p>
    </div>
  );
}
