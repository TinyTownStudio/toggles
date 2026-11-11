export function buildInviteAcceptUrl(betterAuthUrl: string, invitationId: string): string {
  const baseUrl = betterAuthUrl.replace("/api/auth", "");
  return `${baseUrl}/invite/accept?token=${invitationId}`;
}
