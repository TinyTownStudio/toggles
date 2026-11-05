import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const TEST_ENV: Record<string, string> = {
  BETTER_AUTH_SECRET: "test-secret-min-32-chars-long-xxxxxx",
  BETTER_AUTH_URL: "http://localhost",
  APP_ORIGIN: "http://localhost:5173",
  LOCAL: "true",
  POLAR_ACCESS_TOKEN: "ci-test-polar-access-token",
  POLAR_WEBHOOK_SECRET: "ci-test-polar-webhook-secret",
  POLAR_PRO_PRODUCT_ID: "ci-test-polar-pro-product-id",
  PRODUCT_BETA: "false",
};

let tempDir: string | null = null;
let savedEnv: NodeJS.ProcessEnv | null = null;

export function installNodeTestEnv(): void {
  if (tempDir) {
    return;
  }

  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "toggles-node-test-"));
  const dbPath = path.join(tempDir, "test.db");

  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: path.join(appRoot, "drizzle/migrations") });
  sqlite.close();

  savedEnv = { ...process.env };
  for (const [key, value] of Object.entries(TEST_ENV)) {
    process.env[key] = value;
  }
  process.env.DATABASE_URL = dbPath;
}

export function teardownNodeTestEnv(): void {
  if (savedEnv) {
    process.env = savedEnv;
    savedEnv = null;
  }
  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
}
