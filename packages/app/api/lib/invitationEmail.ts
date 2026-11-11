import { resolveEmailProvider, sendEmail, type EmailRuntime, type TogglesEmailEnv } from "./email";

export function createInvitationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface InvitationEmailContent {
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
}

function buildInvitationHtml({
  inviterName,
  workspaceName,
  inviteUrl,
}: InvitationEmailContent): string {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: sans-serif; max-width: 480px; margin: 40px auto; color: #111;">
    <h2 style="margin-bottom: 8px;">You've been invited</h2>
    <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join the <strong>${escapeHtml(workspaceName)}</strong> workspace on Toggles.</p>
    <p>
      <a href="${escapeHtml(inviteUrl)}" style="
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
}: InvitationEmailContent): string {
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendWorkspaceInvitationEmail(
  emailEnv: TogglesEmailEnv,
  runtime: EmailRuntime,
  options: InvitationEmailContent & { to: string },
): Promise<{ emailed: boolean }> {
  if (resolveEmailProvider(emailEnv, runtime) === "none") {
    return { emailed: false };
  }

  const result = await sendEmail(
    emailEnv,
    {
      to: options.to,
      subject: `${options.inviterName} invited you to ${options.workspaceName} on Toggles`,
      html: buildInvitationHtml(options),
      text: buildInvitationText(options),
    },
    runtime,
  );

  if (!result.ok) {
    if (result.reason === "email_disabled") {
      return { emailed: false };
    }
    const message =
      "message" in result && result.message ? result.message : "Failed to send invitation email";
    throw new Error(message);
  }

  return { emailed: true };
}
