import { Resend } from "resend";
import { getAppUrl, getEmailConfig } from "@/lib/env";
import { logInfo } from "@/lib/logger";

function renderPasswordResetEmail(args: { resetUrl: string }) {
  return {
    subject: "Reset your Makerventory password",
    text: [
      "A password reset was requested for your Makerventory account.",
      "",
      `Open this link to reset your password: ${args.resetUrl}`,
      "",
      "If you did not request this change, you can ignore this message.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h1 style="font-size:20px;margin-bottom:16px;">Reset your Makerventory password</h1>
        <p>A password reset was requested for your Makerventory account.</p>
        <p>
          <a href="${args.resetUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;">
            Reset password
          </a>
        </p>
        <p>If the button does not work, open this link directly:</p>
        <p><a href="${args.resetUrl}">${args.resetUrl}</a></p>
        <p>If you did not request this change, you can ignore this message.</p>
      </div>
    `,
  };
}

export function buildPasswordResetUrl(token: string) {
  const baseUrl = getAppUrl();
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(args: {
  to: string;
  token: string;
  requestId?: string;
}) {
  const config = getEmailConfig();

  if (!config) {
    return null;
  }

  const resetUrl = buildPasswordResetUrl(args.token);
  const content = renderPasswordResetEmail({ resetUrl });
  const resend = new Resend(config.apiKey);

  const result = await resend.emails.send({
    from: config.from,
    to: args.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
    replyTo: config.replyTo,
  });

  logInfo("auth.password_reset_email_sent", {
    requestId: args.requestId,
    provider: config.provider,
    emailId: "data" in result ? (result.data?.id ?? null) : null,
  });

  return {
    provider: config.provider,
    resetUrl,
  };
}
