export type TogglesEmailProvider = "postmark" | "none";

export interface TogglesEmailEnv {
  TOGGLES_EMAIL_PROVIDER?: string;
  POSTMARK_SERVER_TOKEN?: string;
  TOGGLES_EMAIL_FROM?: string;
  TOGGLES_EMAIL_FROM_NAME?: string;
}

const DEFAULT_FROM_ADDRESS = "invites@localhost";
const DEFAULT_FROM_NAME = "Toggles";

interface InvitationEmailOptions {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
  serverToken: string;
  fromAddress: string;
  fromName: string;
}

export function resolveEmailProvider(emailEnv: TogglesEmailEnv): TogglesEmailProvider {
  const configured = emailEnv.TOGGLES_EMAIL_PROVIDER?.trim().toLowerCase();
  if (configured === "none") return "none";
  if (configured === "postmark") {
    return emailEnv.POSTMARK_SERVER_TOKEN?.trim() ? "postmark" : "none";
  }
  return "none";
}

export function resolveEmailFrom(emailEnv: TogglesEmailEnv): { address: string; name: string } {
  return {
    address: emailEnv.TOGGLES_EMAIL_FROM?.trim() || DEFAULT_FROM_ADDRESS,
    name: emailEnv.TOGGLES_EMAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME,
  };
}

export async function sendInvitationEmailIfEnabled(
  emailEnv: TogglesEmailEnv,
  options: Omit<InvitationEmailOptions, "serverToken" | "fromAddress" | "fromName">,
): Promise<{ sent: boolean }> {
  if (resolveEmailProvider(emailEnv) === "none") {
    return { sent: false };
  }

  const token = emailEnv.POSTMARK_SERVER_TOKEN!.trim();
  const { address, name } = resolveEmailFrom(emailEnv);
  await sendInvitationEmail({
    ...options,
    serverToken: token,
    fromAddress: address,
    fromName: name,
  });
  return { sent: true };
}

export async function sendInvitationEmail({
  to,
  inviterName,
  workspaceName,
  inviteUrl,
  serverToken,
  fromAddress,
  fromName,
}: InvitationEmailOptions): Promise<void> {
  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": serverToken,
    },
    body: JSON.stringify({
      From: `${fromName} <${fromAddress}>`,
      To: to,
      Subject: `${inviterName} invited you to ${workspaceName} on Toggles`,
      HtmlBody: buildInvitationHtml({ inviterName, workspaceName, inviteUrl }),
      TextBody: buildInvitationText({ inviterName, workspaceName, inviteUrl }),
      MessageStream: "outbound",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Postmark error ${response.status}: ${body}`);
  }
}

function buildInvitationHtml({
  inviterName,
  workspaceName,
  inviteUrl,
}: Pick<InvitationEmailOptions, "inviterName" | "workspaceName" | "inviteUrl">): string {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: sans-serif; max-width: 480px; margin: 40px auto; color: #111;">
    <h2 style="margin-bottom: 8px;">You've been invited</h2>
    <p><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on Toggles.</p>
    <p>
      <a href="${inviteUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        background: #111;
        color: #fff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
      ">Accept invitation</a>
    </p>
    <p style="color: #666; font-size: 13px;">This invitation expires in 48 hours. If you did not expect this invitation you can ignore this email.</p>
  </body>
</html>`.trim();
}

function buildInvitationText({
  inviterName,
  workspaceName,
  inviteUrl,
}: Pick<InvitationEmailOptions, "inviterName" | "workspaceName" | "inviteUrl">): string {
  return [
    `You've been invited to join the ${workspaceName} workspace on Toggles.`,
    ``,
    `${inviterName} sent you this invitation.`,
    ``,
    `Accept your invitation: ${inviteUrl}`,
    ``,
    `This invitation expires in 48 hours. If you did not expect this invitation you can ignore this email.`,
  ].join("\n");
}
