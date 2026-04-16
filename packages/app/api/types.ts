import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

export type Bindings = Cloudflare.Env;

export type AgnosticDatabaseInstance<Schema extends Record<string, unknown>> = BaseSQLiteDatabase<
  "sync" | "async",
  unknown,
  Schema
>;

export type Variables<Schema extends Record<string, unknown>> = {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  } | null;
  apiKeyData: {
    userId: string;
    permissions: Record<string, string[]> | null;
  } | null;
  db: AgnosticDatabaseInstance<Schema>;
};
