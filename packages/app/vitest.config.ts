import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "drizzle/migrations"));
  return {
    test: {
      poolOptions: {
        workers: {
          wrangler: { configPath: "./wrangler.test.jsonc" },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              BETTER_AUTH_SECRET: "test-secret-min-32-chars-long-xxxxxx",
              BETTER_AUTH_URL: "http://localhost",
              LOCAL: "true",
            },
          },
        },
      },
    },
  };
});
