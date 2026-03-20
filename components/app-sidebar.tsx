"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Search, Sparkles } from "lucide-react";
import { navigation } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-[30px] border border-slate-200/80 bg-slate-950 px-5 py-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
      <div className="flex items-center gap-3 border-b border-white/10 pb-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
          <Box className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
            Makerventory
          </p>
          <p className="mt-1 text-sm text-slate-200">
            Workshop Operations
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Search className="h-4 w-4" />
          Search inventory, maintenance, and purchase plans
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
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                      active
                        ? "bg-white text-slate-950"
                        : "text-slate-300 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
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
    </aside>
  );
}
