export function deriveHotendInstalledCount(installedPrinterId: string | null | undefined) {
  return installedPrinterId ? 1 : 0;
}

export function deriveHotendSpareCount(quantity: number, installedPrinterId: string | null | undefined) {
  return Math.max(quantity - deriveHotendInstalledCount(installedPrinterId), 0);
}

export function deriveHotendStatus(args: {
  quantity: number;
  installedPrinterId?: string | null;
  persistedStatus?: string | null;
}) {
  if (args.persistedStatus === "RETIRED") {
    return "RETIRED" as const;
  }

  if (deriveHotendInstalledCount(args.installedPrinterId ?? null) > 0) {
    return "IN_USE" as const;
  }

  return args.quantity <= 1 ? "LOW_STOCK" as const : "AVAILABLE" as const;
}

export function deriveBuildPlateStatus(args: {
  installedPrinterId?: string | null;
  persistedStatus?: string | null;
}) {
  if (args.persistedStatus === "RETIRED") {
    return "RETIRED" as const;
  }

  if (args.persistedStatus === "WORN") {
    return "WORN" as const;
  }

  return args.installedPrinterId ? "IN_USE" as const : "AVAILABLE" as const;
}
