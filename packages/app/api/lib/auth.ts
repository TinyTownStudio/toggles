import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { apiKey } from "@better-auth/api-key";
import * as schema from "../db/schema";
import { getAppOrigin, polarCheckoutReturnUrl, polarCheckoutSuccessUrl } from "./appOrigin";
import { createPolarClient } from "./polarClient";
import {
  handleCustomerCreated,
  handleSubscriptionActive,
  handleSubscriptionCanceled,
  handleSubscriptionRevoked,
  handleSubscriptionUpdated,
} from "./polarSubscriptionHandlers";
import type { AgnosticDatabaseInstance } from "../types";

type Env = Cloudflare.Env;

export function createAuth(env: Env, db: AgnosticDatabaseInstance<typeof schema>) {
  const polarClient = createPolarClient(env);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        apikey: schema.apikey,
      },
    }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: [getAppOrigin(env)],
    plugins: [
      apiKey({
        enableMetadata: true,
        schema: {
          apikey: {
            fields: {
              referenceId: "userId",
            },
          },
        },
        // Better Auth defaults to 10 requests per 24h per key; we enforce plan limits ourselves.
        rateLimit: {
          enabled: false,
        },
      }),
      polar({
        client: polarClient,
        // We disable automatic customer creation because we want to control when customers are created in Polar
        // this also allows your auth to work without a working polar key.
        createCustomerOnSignUp: false,
        use: [
          checkout({
            authenticatedUsersOnly: true,
            products: [
              {
                productId: env.POLAR_PRO_PRODUCT_ID,
                slug: "pro",
              },
            ],
            // This success URL is more to support local-dev so we don't have to only use
            // webhooks. All though local webhooks are now possible with https://polar.sh/docs/integrate/webhooks/locally
            successUrl: polarCheckoutSuccessUrl(env),
            returnUrl: polarCheckoutReturnUrl(env),
          }),
          portal(),
          webhooks({
            secret: env.POLAR_WEBHOOK_SECRET,
            onSubscriptionUpdated: async (payload) => {
              await handleSubscriptionUpdated(db, env, payload.data);
            },
            onSubscriptionActive: async (payload) => {
              await handleSubscriptionActive(db, payload.data);
            },
            onSubscriptionCanceled: async (payload) => {
              await handleSubscriptionCanceled(db, payload.data.customer_id);
            },
            onSubscriptionRevoked: async (payload) => {
              await handleSubscriptionRevoked(db, payload.data.customer_id);
            },
            onCustomerCreated: async (payload) => {
              await handleCustomerCreated(db, payload.data);
            },
          }),
        ],
      }),
    ],
  });
}
