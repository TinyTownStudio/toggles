import "dotenv/config"
import { defineConfig } from "drizzle-kit";
import process from "node:process"

export default defineConfig({
  dialect: "sqlite",
  schema: "./api/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: { url: process.env.DATABASE_URL! }
});
