import { headers } from "next/headers";

type LogLevel = "info" | "warn" | "error";
type LogMeta = Record<string, unknown>;

function writeLog(level: LogLevel, event: string, meta: LogMeta = {}) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...meta,
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export async function getRequestLogContext(extra: LogMeta = {}) {
  const headerStore = await headers();
  return {
    requestId: headerStore.get("x-request-id") ?? crypto.randomUUID(),
    ...extra,
  };
}

export function logInfo(event: string, meta?: LogMeta) {
  writeLog("info", event, meta);
}

export function logWarn(event: string, meta?: LogMeta) {
  writeLog("warn", event, meta);
}

export function logError(event: string, error: unknown, meta: LogMeta = {}) {
  writeLog("error", event, {
    ...meta,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
          }
        : String(error),
  });
}
