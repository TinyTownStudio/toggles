const FROM_ADDRESS = "invites@toggles.tinytown.studio";
const FROM_NAME = "Toggles";

interface InvitationEmailOptions {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
  serverToken: string;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  workspaceName,
  inviteUrl,
  serverToken,
}: InvitationEmailOptions): Promise<void> {
  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": serverToken,
    },
    body: JSON.stringify({
      From: `${FROM_NAME} <${FROM_ADDRESS}>`,
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
}: Omit<InvitationEmailOptions, "to" | "serverToken">): string {
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
}: Omit<InvitationEmailOptions, "to" | "serverToken">): string {
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
