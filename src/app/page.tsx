import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user.role === "admin") redirect("/admin/dashboard");
  if (session?.user.role === "member") redirect("/member/dashboard");
  redirect("/login");
}
