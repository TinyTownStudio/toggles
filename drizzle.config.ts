import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
	schema: "./api/db/schema.ts",
	out: "./drizzle/migrations",
});
