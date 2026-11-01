import { isSmtpConfigured, resolveEmailProvider, validateSmtpConfig } from "./config";
import { sendViaCloudflare } from "./sendCloudflare";
import type { EmailRuntime, OutboundEmail, SendEmailOutcome, TogglesEmailEnv } from "./types";

export async function sendEmail(
  emailEnv: TogglesEmailEnv,
  message: OutboundEmail,
  runtime: EmailRuntime,
): Promise<SendEmailOutcome> {
  const provider = resolveEmailProvider(emailEnv, runtime);

  if (provider === "none") {
    return { ok: false, reason: "email_disabled" };
  }

  if (provider === "smtp" && runtime === "node") {
    const smtpErrors = validateSmtpConfig(emailEnv);
    if (smtpErrors.length > 0) {
      return {
        ok: false,
        reason: "misconfigured",
        message: smtpErrors.join("; "),
      };
    }
  }

  try {
    if (provider === "cloudflare") {
      await sendViaCloudflare(emailEnv, message);
    } else if (provider === "smtp") {
      const { sendViaSmtp } = await import("./smtp.node.ts");
      await sendViaSmtp(emailEnv, message);
    } else {
      return { ok: false, reason: "email_disabled" };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Email send failed";
    return { ok: false, reason: "send_failed", message: msg };
  }

  return { ok: true, provider };
}

/** @internal Exposed for tests to assert SMTP is not loaded when disabled. */
export function shouldLoadSmtpModule(emailEnv: TogglesEmailEnv, runtime: EmailRuntime): boolean {
  return resolveEmailProvider(emailEnv, runtime) === "smtp" && isSmtpConfigured(emailEnv);
}
