"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ListOrdered,
  Gift,
  Package,
  BarChart3,
  LogOut,
  Car,
  Settings,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/contributions", label: "Contributions", icon: CreditCard },
  { href: "/admin/queue", label: "Queue", icon: ListOrdered },
  { href: "/admin/giveaways", label: "Giveaways", icon: Gift },
  { href: "/admin/giveaway-items", label: "Giveaway Items", icon: Package },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-60 flex flex-col" style={{ background: "var(--sidebar)" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30 flex-shrink-0">
          <Car className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight" style={{ color: "var(--sidebar-foreground)" }}>
            Community Fund
          </p>
          <p className="text-[11px] leading-tight mt-0.5" style={{ color: "oklch(0.60 0.01 247)" }}>
            Admin Panel
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "text-white"
                  : "hover:text-white"
              )}
              style={
                active
                  ? { background: "var(--sidebar-primary)", color: "white" }
                  : { color: "oklch(0.70 0.01 247)" }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "var(--sidebar-accent)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--sidebar-foreground)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLAnchorElement).style.background = "";
                  (e.currentTarget as HTMLAnchorElement).style.color = "oklch(0.70 0.01 247)";
                }
              }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5" style={{ borderTop: "1px solid var(--sidebar-border)", paddingTop: "0.75rem" }}>
        <Link
          href="/admin/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
          style={{ color: "oklch(0.70 0.01 247)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--sidebar-accent)";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--sidebar-foreground)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "";
            (e.currentTarget as HTMLAnchorElement).style.color = "oklch(0.70 0.01 247)";
          }}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          Settings
        </Link>

        {/* User info + logout */}
        <div className="flex items-center gap-2.5 mt-2 px-3 py-2.5 rounded-lg" style={{ background: "var(--sidebar-accent)" }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/30 text-xs font-semibold flex-shrink-0" style={{ color: "oklch(0.80 0.15 264)" }}>
            {session?.user?.name?.charAt(0)?.toUpperCase() ?? "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: "var(--sidebar-foreground)" }}>
              {session?.user?.name ?? "Admin"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "oklch(0.55 0.01 247)" }}>
              {session?.user?.email ?? ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex-shrink-0 rounded-md p-1 transition-colors"
            style={{ color: "oklch(0.55 0.01 247)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.80 0.15 28)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "oklch(0.55 0.01 247)"; }}
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
