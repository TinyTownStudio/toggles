/**
 * Outbound mail From address (issue #17). No mail is sent today; this centralizes config only.
 * Set `TOGGLES_MAIL_FROM` in the environment. Hosted defaults live in wrangler.jsonc, not here.
 */
export function getMailFrom(env: { TOGGLES_MAIL_FROM?: string }): string | undefined {
  const value = env.TOGGLES_MAIL_FROM?.trim();
  return value || undefined;
}
