"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Car, LayoutDashboard, User, CreditCard, Gift, LogOut } from "lucide-react";

const navItems = [
  { href: "/member/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/member/profile", label: "Profile", icon: User },
  { href: "/member/contributions", label: "Payments", icon: CreditCard },
  { href: "/member/giveaways", label: "Giveaways", icon: Gift },
];

export default function MemberNav({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/30">
              <Car className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm text-foreground">Community Fund</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User + logout */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60">
              <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-semibold text-primary">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-muted-foreground max-w-[120px] truncate">{userName}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex sm:hidden gap-0.5 pb-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className="h-3 w-3" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
