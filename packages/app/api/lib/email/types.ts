export type TogglesEmailProvider = "cloudflare" | "smtp" | "none";

export type EmailRuntime = "worker" | "node";

export interface TogglesEmailEnv {
  TOGGLES_EMAIL_PROVIDER?: string;
  TOGGLES_EMAIL_FROM?: string;
  TOGGLES_EMAIL_FROM_NAME?: string;
  TOGGLES_SMTP_HOST?: string;
  TOGGLES_SMTP_PORT?: string;
  TOGGLES_SMTP_SECURE?: string;
  TOGGLES_SMTP_USER?: string;
  TOGGLES_SMTP_PASSWORD?: string;
  /** Cloudflare Workers `send_email` binding (hosted only). */
  EMAIL?: SendEmail;
}

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type SendEmailOutcome =
  | { ok: true; provider: TogglesEmailProvider }
  | { ok: false; reason: "email_disabled" }
  | { ok: false; reason: "misconfigured"; message: string }
  | { ok: false; reason: "send_failed"; message: string };
