import { resolveEmailFrom } from "./config";
import type { OutboundEmail, TogglesEmailEnv } from "./types";

export async function sendViaCloudflare(
  emailEnv: TogglesEmailEnv,
  message: OutboundEmail,
): Promise<void> {
  const binding = emailEnv.EMAIL;
  if (!binding) {
    throw new Error("Cloudflare Email binding is not configured");
  }

  const from = resolveEmailFrom(emailEnv);
  await binding.send({
    from: { email: from.address, name: from.name },
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
