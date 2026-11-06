/** Test double for Polar subscription iteration used by api/index billing-success tests. */
import { env } from "cloudflare:test";

function readSubscriptions(): Record<string, unknown>[] {
  const raw = env.TEST_POLAR_SUBSCRIPTIONS_JSON;
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
}

export function iterListSubscriptions(_client: unknown) {
  return async function* (_query: Record<string, unknown>) {
    for (const sub of readSubscriptions()) {
      yield sub;
    }
  };
}
