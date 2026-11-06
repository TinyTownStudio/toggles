import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import path from "node:path";
import { defineConfig } from "vitest/config";

const migrations = await readD1Migrations(path.join(__dirname, "drizzle/migrations"));

const sharedMiniflare = {
  compatibilityFlags: [
    "enable_nodejs_fs_module",
    "enable_nodejs_http_modules",
    "enable_nodejs_tty_module",
    "enable_nodejs_perf_hooks_module",
    "enable_nodejs_v8_module",
    "enable_nodejs_process_v2",
  ],
  bindings: {
    TEST_MIGRATIONS: migrations,
    BETTER_AUTH_SECRET: "test-secret-min-32-chars-long-xxxxxx",
    BETTER_AUTH_URL: "http://localhost",
    LOCAL: "true",
    POLAR_ACCESS_TOKEN: "test-polar-token",
    POLAR_WEBHOOK_SECRET: "test-webhook-secret",
    POLAR_PRO_PRODUCT_ID: "test-product-id",
    TOGGLES_BILLING_ENABLED: "true",
    TEST_POLAR_CHECKOUT_JSON: "",
    TEST_POLAR_SUBSCRIPTIONS_JSON: "",
  },
};

export default defineConfig({
  test: {
    hookTimeout: 60_000,
    testTimeout: 60_000,
    exclude: ["**/node_modules/**", "api/tests/node/**"],
    coverage: {
      provider: "istanbul",
    },
    projects: [
      {
        extends: true,
        test: {
          name: "hosted",
          include: ["api/tests/**/*.test.ts"],
          exclude: ["api/tests/teamsSelfHosted.test.ts"],
        },
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./wrangler.test.jsonc" },
            miniflare: sharedMiniflare,
          }),
        ],
      },
      {
        extends: true,
        test: {
          name: "selfhosted",
          include: ["api/tests/teamsSelfHosted.test.ts"],
        },
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./wrangler.selfhost.test.jsonc" },
            miniflare: {
              ...sharedMiniflare,
              bindings: {
                ...sharedMiniflare.bindings,
                TOGGLES_BILLING_ENABLED: "false",
              },
            },
          }),
        ],
      },
    ],
  },
  resolve: {
    alias: {
      "@polar-sh/sdk/2026-10/services/checkouts": path.join(
        __dirname,
        "api/tests/mocks/polarCheckouts.ts",
      ),
      "@polar-sh/sdk/2026-10/services/subscriptions": path.join(
        __dirname,
        "api/tests/mocks/polarSubscriptions.ts",
      ),
    },
  },
});
