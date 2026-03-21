import Image from "next/image";
import { cn } from "@/lib/utils";

const wordmarkShadow = "drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]";

export function BrandLockup({
  theme = "dark",
  size = "default",
  subtitle,
  className,
}: {
  theme?: "dark" | "light";
  size?: "compact" | "default";
  subtitle?: string;
  className?: string;
}) {
  const darkTheme = theme === "dark";
  const wordmarkSrc = darkTheme
    ? "/brand/makerventory-wordmark-no-logo-dark.svg"
    : "/brand/makerventory-wordmark-no-logo-light.svg";

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl p-2.5 shadow-[0_4px_4px_rgba(0,0,0,0.25)]",
          darkTheme ? "bg-slate-950" : "bg-white/10",
          size === "compact" ? "h-12 w-12" : "h-14 w-14",
        )}
      >
        <Image
          src="/brand/makerventory-mark-light.svg"
          alt="Makerventory mark"
          width={size === "compact" ? 28 : 34}
          height={size === "compact" ? 28 : 34}
          className={cn(size === "compact" ? "h-7 w-7" : "h-8.5 w-8.5", wordmarkShadow)}
          priority
        />
      </div>

      <div className="min-w-0">
        <Image
          src={wordmarkSrc}
          alt="MAKERVENTORY"
          width={size === "compact" ? 220 : 250}
          height={size === "compact" ? 36 : 40}
          className={cn(
            "h-auto max-w-full",
            wordmarkShadow,
            size === "compact" ? "w-[180px] sm:w-[200px]" : "w-[210px] sm:w-[240px]",
          )}
          priority
        />
        {subtitle ? (
          <p className={cn("mt-1 text-xs sm:text-sm", darkTheme ? "text-slate-500" : "text-slate-300")}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
