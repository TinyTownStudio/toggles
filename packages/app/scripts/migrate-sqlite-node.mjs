#!/usr/bin/env node
/**
 * Apply Drizzle migrations to a SQLite file at DATABASE_URL (Node self-host layout).
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dbPath = process.env.DATABASE_URL;
if (!dbPath) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: path.join(appRoot, "drizzle/migrations") });
sqlite.close();
console.log(`Migrations applied to ${dbPath}`);
