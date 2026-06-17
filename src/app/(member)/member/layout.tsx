import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import MemberNav from "@/components/member/MemberNav";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "member") redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <MemberNav userName={session.user.name ?? "Member"} />
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
