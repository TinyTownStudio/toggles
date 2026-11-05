import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["api/tests/node/**/*.test.ts"],
    setupFiles: ["api/tests/node/setupEnv.ts"],
  },
});
