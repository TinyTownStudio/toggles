import type { EmailRuntime } from "./email";

/** Cloudflare Workers expose `DB`; self-hosted Node uses `DATABASE_URL` without `DB`. */
export function getEmailRuntime(env: { DB?: D1Database; DATABASE_URL?: string }): EmailRuntime {
  return env.DB !== undefined ? "worker" : "node";
}
