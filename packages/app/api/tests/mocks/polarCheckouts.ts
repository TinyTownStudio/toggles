/** Test double for Polar checkout fetch used by api/index billing-success tests. */
import { env } from "cloudflare:test";

export function getCheckouts(_client: unknown) {
  return async (_checkoutId: string): Promise<Record<string, unknown> | null> => {
    const raw = env.TEST_POLAR_CHECKOUT_JSON;
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  };
}
