"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { navigation } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function MobileNav({
  workspaceName,
  userEmail,
}: {
  workspaceName: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between gap-3 rounded-[24px] border border-slate-200/80 bg-white/90 px-3 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:px-4">
        <BrandLockup theme="dark" size="compact" subtitle={workspaceName} />

        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="secondary" size="sm" className="shrink-0">
              <Menu className="h-4 w-4" />
              Menu
            </Button>
          </DialogTrigger>
          <DialogContent className="left-auto right-2 top-2 w-[calc(100vw-1rem)] max-w-sm translate-x-0 translate-y-0 rounded-[28px] p-0 sm:right-4 sm:top-4 sm:w-[calc(100vw-2rem)]">
            <div className="rounded-[28px] bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Navigation</p>
                  <p className="mt-2 truncate text-sm text-slate-300">{userEmail}</p>
                </div>
                <DialogClose className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </div>

              <div className="mt-6 space-y-6">
                {navigation.map((section) => (
                  <div key={section.title}>
                    <p className="mb-3 text-xs uppercase tracking-[0.28em] text-slate-500">
                      {section.title}
                    </p>
                    <div className="space-y-1.5">
                      {section.items.map((item) => {
                        const active =
                          item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
                        const Icon = item.icon;

                        return (
                          <DialogClose asChild key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                                active
                                  ? "bg-slate-50 font-semibold text-slate-950"
                                  : "text-slate-300 hover:bg-white/8 hover:text-white",
                              )}
                            >
                              <Icon
                                className={cn(
                                  "h-4 w-4",
                                  active ? "!text-slate-950" : "text-slate-400",
                                )}
                              />
                              <span className="break-words">{item.label}</span>
                            </Link>
                          </DialogClose>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => signOut({ callbackUrl: "/sign-in" })}
                >
                  Sign out
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
