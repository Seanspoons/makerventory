"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Search, Sparkles } from "lucide-react";
import { navigation } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AppSidebar({
  workspaceName,
  userEmail,
}: {
  workspaceName: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="sidebar-scroll h-full overflow-y-auto rounded-[30px] border border-slate-200/80 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
      <div className="flex items-center gap-3 border-b border-white/10 pb-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 p-2">
          <Image
            src="/brand/makerventory-mark-light.svg"
            alt="Makerventory mark"
            width={28}
            height={28}
            className="h-7 w-7 drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
            priority
          />
        </div>
        <div className="min-w-0">
          <p
            className="text-[1.75rem] leading-none tracking-[0.04em] text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
            style={{
              fontFamily:
                '"Rajdhani", "DIN Alternate", "Arial Narrow", ui-sans-serif, system-ui, sans-serif',
            }}
          >
            <span className="font-bold">Maker</span>
            <span className="font-normal">ventory</span>
          </p>
          <p className="mt-1 text-sm text-slate-300">Workshop Operations</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Search className="h-4 w-4" />
          {workspaceName}
        </div>
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

      <div className="mt-8 rounded-[26px] border border-emerald-400/20 bg-emerald-400/10 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-200">
          <Sparkles className="h-4 w-4" />
          Future-ready workshop
        </div>
        <p className="mt-2 text-sm leading-6 text-emerald-50/80">
          Structured for telemetry, QR labels, smart-plug automation, and spool
          consumption tracking.
        </p>
      </div>

      <div className="mt-4 rounded-[26px] border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Session</p>
        <p className="mt-2 truncate text-sm text-slate-200">{userEmail}</p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/sign-in" })}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/8 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
