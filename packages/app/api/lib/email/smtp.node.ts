import { parseSmtpSecure, resolveEmailFrom } from "./config";
import type { OutboundEmail, TogglesEmailEnv } from "./types";

export async function sendViaSmtp(
  emailEnv: TogglesEmailEnv,
  message: OutboundEmail,
): Promise<void> {
  const { createTransport } = await import("nodemailer");
  const from = resolveEmailFrom(emailEnv);
  const host = emailEnv.TOGGLES_SMTP_HOST!.trim();
  const port = Number(emailEnv.TOGGLES_SMTP_PORT!.trim());
  const secure = parseSmtpSecure(emailEnv);

  const transport = createTransport({
    host,
    port,
    secure,
    auth: {
      user: emailEnv.TOGGLES_SMTP_USER!.trim(),
      pass: emailEnv.TOGGLES_SMTP_PASSWORD!.trim(),
    },
  });

  await transport.sendMail({
    from: `${from.name} <${from.address}>`,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
