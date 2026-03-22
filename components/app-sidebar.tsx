"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CircleUserRound, ClipboardList, LogOut, Search } from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { navigation } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AppSidebar({
  workspaceName,
  userEmail,
  dailyFocus,
}: {
  workspaceName: string;
  userEmail: string;
  dailyFocus: {
    title: string;
    body: string;
    href: Route;
  };
}) {
  const pathname = usePathname();

  return (
    <aside className="sidebar-scroll h-full overflow-y-auto rounded-[30px] border border-slate-200/80 bg-slate-950 px-4 py-5 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:px-5 sm:py-6">
      <div className="flex items-center gap-3 border-b border-white/10 pb-5">
        <BrandLockup theme="light" size="compact" subtitle="Workshop Control Center" />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <Link
          href="/search"
          className="flex items-center gap-2 break-words rounded-xl text-sm text-slate-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          <Search className="h-4 w-4" />
          <span className="min-w-0 break-words">Search {workspaceName}</span>
        </Link>
      </div>

      <nav className="mt-6 space-y-6">
        {navigation.map((section) => (
          <div key={section.title}>
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-500">
              {section.title}
            </p>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-slate-50 font-semibold text-slate-950 ring-1 ring-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                        : "text-slate-300 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        active ? "!text-slate-950" : "text-slate-400",
                      )}
                    />
                    <span className={cn(active ? "!text-slate-950" : "text-inherit")}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-8 rounded-[26px] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <ClipboardList className="h-4 w-4" />
          Daily focus
        </div>
        <p className="mt-2 text-sm font-medium text-white">{dailyFocus.title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{dailyFocus.body}</p>
        <Link
          href={dailyFocus.href}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/8 hover:text-white"
        >
          Open
        </Link>
      </div>

      <div className="mt-4 rounded-[26px] border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Session</p>
        <p className="mt-2 truncate text-sm text-slate-200">{userEmail}</p>
        <Link
          href="/account"
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/8 hover:text-white"
        >
          <CircleUserRound className="h-4 w-4" />
          My account
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
