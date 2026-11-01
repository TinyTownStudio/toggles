import type { EmailRuntime, TogglesEmailEnv, TogglesEmailProvider } from "./types";

const DEFAULT_FROM_ADDRESS = "noreply@localhost";
const DEFAULT_FROM_NAME = "Toggles";

export function resolveEmailFrom(emailEnv: TogglesEmailEnv): { address: string; name: string } {
  return {
    address: emailEnv.TOGGLES_EMAIL_FROM?.trim() || DEFAULT_FROM_ADDRESS,
    name: emailEnv.TOGGLES_EMAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME,
  };
}

export function hasCloudflareEmailBinding(emailEnv: TogglesEmailEnv): boolean {
  return emailEnv.EMAIL !== undefined;
}

export function isSmtpConfigured(emailEnv: TogglesEmailEnv): boolean {
  return validateSmtpConfig(emailEnv).length === 0;
}

/** Returns a list of human-readable configuration problems (empty when valid). */
export function validateSmtpConfig(emailEnv: TogglesEmailEnv): string[] {
  const errors: string[] = [];
  const host = emailEnv.TOGGLES_SMTP_HOST?.trim();
  const portRaw = emailEnv.TOGGLES_SMTP_PORT?.trim();
  const user = emailEnv.TOGGLES_SMTP_USER?.trim();
  const password = emailEnv.TOGGLES_SMTP_PASSWORD?.trim();

  if (!host) {
    errors.push("TOGGLES_SMTP_HOST is required");
  }
  if (!portRaw) {
    errors.push("TOGGLES_SMTP_PORT is required");
  } else {
    const port = Number(portRaw);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      errors.push("TOGGLES_SMTP_PORT must be an integer between 1 and 65535");
    }
  }
  if (!user) {
    errors.push("TOGGLES_SMTP_USER is required");
  }
  if (!password) {
    errors.push("TOGGLES_SMTP_PASSWORD is required");
  }

  const secureRaw = emailEnv.TOGGLES_SMTP_SECURE?.trim().toLowerCase();
  if (secureRaw !== undefined && secureRaw !== "") {
    if (!["true", "false", "1", "0", "yes", "no"].includes(secureRaw)) {
      errors.push("TOGGLES_SMTP_SECURE must be true or false");
    }
  }

  return errors;
}

export function parseSmtpSecure(emailEnv: TogglesEmailEnv): boolean {
  const raw = emailEnv.TOGGLES_SMTP_SECURE?.trim().toLowerCase();
  if (raw === undefined || raw === "") {
    return Number(emailEnv.TOGGLES_SMTP_PORT?.trim()) === 465;
  }
  return raw === "true" || raw === "1" || raw === "yes";
}

export function resolveEmailProvider(
  emailEnv: TogglesEmailEnv,
  runtime: EmailRuntime,
): TogglesEmailProvider {
  const configured = emailEnv.TOGGLES_EMAIL_PROVIDER?.trim().toLowerCase();

  if (configured === "none") {
    return "none";
  }

  if (configured === "cloudflare") {
    return hasCloudflareEmailBinding(emailEnv) ? "cloudflare" : "none";
  }

  if (configured === "smtp") {
    if (runtime !== "node") {
      return "none";
    }
    return isSmtpConfigured(emailEnv) ? "smtp" : "none";
  }

  if (configured !== undefined && configured !== "") {
    return "none";
  }

  if (runtime === "worker") {
    return hasCloudflareEmailBinding(emailEnv) ? "cloudflare" : "none";
  }

  return isSmtpConfigured(emailEnv) ? "smtp" : "none";
}
