import { createPolarCore } from "@polar-sh/sdk/2026-10";
import type { PolarCore } from "@polar-sh/sdk/2026-10";
import { isProduction } from "../utils/isProduction";

type PolarEnv = Pick<Cloudflare.Env, "POLAR_ACCESS_TOKEN">;

export function createPolarClient(env: PolarEnv & Cloudflare.Env): PolarCore {
  return createPolarCore({
    accessToken: env.POLAR_ACCESS_TOKEN,
    environment: isProduction(env) ? "production" : "sandbox",
  });
}
