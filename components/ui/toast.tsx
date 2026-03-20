"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import type { FlashMessage } from "@/lib/flash";
import { cn } from "@/lib/utils";

export function ToastViewport({ flash }: { flash: FlashMessage | null }) {
  const [visible, setVisible] = useState(Boolean(flash));

  useEffect(() => {
    setVisible(Boolean(flash));
    if (!flash) {
      return;
    }

    const timeout = window.setTimeout(() => setVisible(false), 4200);
    return () => window.clearTimeout(timeout);
  }, [flash]);

  if (!flash || !visible) {
    return null;
  }

  const success = flash.type === "success";

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] w-full max-w-sm">
      <div
        className={cn(
          "pointer-events-auto rounded-[24px] border p-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)]",
          success
            ? "border-emerald-200 bg-emerald-50"
            : "border-rose-200 bg-rose-50",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5",
              success ? "text-emerald-700" : "text-rose-700",
            )}
          >
            {success ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <CircleAlert className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "font-medium",
                success ? "text-emerald-950" : "text-rose-950",
              )}
            >
              {flash.title}
            </p>
            {flash.message ? (
              <p
                className={cn(
                  "mt-1 text-sm leading-6",
                  success ? "text-emerald-900/80" : "text-rose-900/80",
                )}
              >
                {flash.message}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-full p-1 text-slate-500 transition hover:bg-white/60 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
