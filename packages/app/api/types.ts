import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { AnyD1Database, DrizzleD1Database } from "drizzle-orm/d1";

export type Bindings = Cloudflare.Env;

export type AgnosticDatabaseInstance<Schema extends Record<string, unknown>> =
  | (DrizzleD1Database<Schema> & {
      $client: AnyD1Database;
    })
  | (BetterSQLite3Database<Schema> & {
      $client: import("better-sqlite3").Database;
    });

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
