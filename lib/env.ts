type ServerEnvKey =
  | "DATABASE_URL"
  | "NEXTAUTH_URL"
  | "NEXTAUTH_SECRET"
  | "AUTH_SECRET"
  | "RESEND_API_KEY"
  | "EMAIL_FROM"
  | "EMAIL_REPLY_TO"
  | "ALLOW_INSECURE_DEV_RESET_LINKS"
  | "VERCEL_URL";

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function readEnv(key: ServerEnvKey) {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
}

export function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

function isStrictHostedEnvironment() {
  return Boolean(
    process.env.CI === "true" ||
      process.env.VERCEL ||
      process.env.RAILWAY_ENVIRONMENT ||
      process.env.STRICT_ENV_VALIDATION === "true",
  );
}

export function getAuthSecret() {
  const secret = readEnv("AUTH_SECRET") || readEnv("NEXTAUTH_SECRET");

  if (!secret) {
    if (!isStrictHostedEnvironment()) {
      return "makerventory-local-dev-auth-secret";
    }

    throw new ConfigurationError(
      "Missing AUTH_SECRET or NEXTAUTH_SECRET. Set a long random auth secret before running Makerventory.",
    );
  }

  return secret;
}

export function getAppUrl() {
  const explicitUrl = readEnv("NEXTAUTH_URL");
  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, "");
  }

  const vercelUrl = readEnv("VERCEL_URL");
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }

  if (isProductionEnvironment()) {
    throw new ConfigurationError(
      "Missing NEXTAUTH_URL. Set the canonical public app URL for hosted deployments.",
    );
  }

  return "http://localhost:3000";
}

export function allowInsecureDevResetLinks() {
  return !isProductionEnvironment() && readEnv("ALLOW_INSECURE_DEV_RESET_LINKS") === "true";
}

export function getEmailConfig() {
  const apiKey = readEnv("RESEND_API_KEY");
  const from = readEnv("EMAIL_FROM");
  const replyTo = readEnv("EMAIL_REPLY_TO");

  if (!apiKey) {
    if (isProductionEnvironment()) {
      throw new ConfigurationError(
        "Missing RESEND_API_KEY. Hosted password reset email delivery requires a Resend API key.",
      );
    }

    return null;
  }

  if (!from) {
    throw new ConfigurationError(
      "Missing EMAIL_FROM. Set the verified sender address used for Makerventory auth emails.",
    );
  }

  return {
    provider: "resend" as const,
    apiKey,
    from,
    replyTo: replyTo || undefined,
  };
}
