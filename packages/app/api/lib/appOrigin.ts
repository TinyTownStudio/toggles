/** Vite dev server origin when `LOCAL=true` and `APP_ORIGIN` is unset. */
export const LOCAL_DEV_ORIGIN = "http://localhost:5173";

type AppOriginEnv = Pick<Cloudflare.Env, "APP_ORIGIN" | "LOCAL" | "BETTER_AUTH_URL">;

/**
 * Public web origin (scheme + host + port) for CORS, auth redirects, and billing URLs.
 * Self-hosted installs should set `APP_ORIGIN`; hosted Cloudflare deploy sets it in wrangler.jsonc.
 * No hosted-domain default is baked into runtime code.
 */
export function getAppOrigin(env: AppOriginEnv): string {
  const explicit = env.APP_ORIGIN?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  if (env.LOCAL === "true") {
    return LOCAL_DEV_ORIGIN;
  }
  try {
    return new URL(env.BETTER_AUTH_URL).origin;
  } catch {
    return LOCAL_DEV_ORIGIN;
  }
}

export function billingSuccessRedirect(env: AppOriginEnv): string {
  return `${getAppOrigin(env)}/app/billing?success=true`;
}

export function polarCheckoutSuccessUrl(env: AppOriginEnv): string {
  return `${getAppOrigin(env)}/api/billing-success?checkout_id={CHECKOUT_ID}`;
}

export function polarCheckoutReturnUrl(env: AppOriginEnv): string {
  return `${getAppOrigin(env)}/app/billing`;
}
