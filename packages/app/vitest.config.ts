import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import path from "node:path";
import { defineConfig } from "vitest/config";

const migrations = await readD1Migrations(path.join(__dirname, "drizzle/migrations"));

export default defineConfig({
  test: {
    coverage: {
      provider: "istanbul",
    },
  },
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.test.jsonc" },
      miniflare: {
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
        },
      },
    }),
  ],
});
