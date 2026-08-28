import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import type { AgnosticDatabaseInstance } from "../types";

export type EnvironmentRow = typeof schema.environment.$inferSelect;
export type ToggleRow = typeof schema.toggle.$inferSelect;

const DEFAULT_ENV_NAME = "Production";
const DEFAULT_ENV_SLUG = "production";

export function slugifyEnvironmentName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listProjectEnvironments(
  db: AgnosticDatabaseInstance<typeof schema>,
  projectId: string,
): Promise<EnvironmentRow[]> {
  return db
    .select()
    .from(schema.environment)
    .where(eq(schema.environment.projectId, projectId))
    .all();
}

export async function getDefaultEnvironment(
  db: AgnosticDatabaseInstance<typeof schema>,
  projectId: string,
): Promise<EnvironmentRow | undefined> {
  return db
    .select()
    .from(schema.environment)
    .where(and(eq(schema.environment.projectId, projectId), eq(schema.environment.isDefault, true)))
    .get();
}

export async function ensureDefaultEnvironment(
  db: AgnosticDatabaseInstance<typeof schema>,
  projectId: string,
): Promise<EnvironmentRow> {
  const existing = await getDefaultEnvironment(db, projectId);
  if (existing) return existing;

  const now = new Date();
  const id = crypto.randomUUID();

  try {
    await db.insert(schema.environment).values({
      id,
      projectId,
      name: DEFAULT_ENV_NAME,
      slug: DEFAULT_ENV_SLUG,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    // Another request may have created the default environment concurrently.
  }

  const created = await getDefaultEnvironment(db, projectId);
  if (!created) throw new Error("Failed to create default environment");
  return created;
}

export async function resolveEnvironment(
  db: AgnosticDatabaseInstance<typeof schema>,
  projectId: string,
  envSlug?: string | null,
): Promise<EnvironmentRow> {
  await ensureDefaultEnvironment(db, projectId);

  if (!envSlug?.trim()) {
    const defaultEnv = await getDefaultEnvironment(db, projectId);
    if (!defaultEnv) throw new Error("Default environment not found");
    return defaultEnv;
  }

  const env = await db
    .select()
    .from(schema.environment)
    .where(
      and(eq(schema.environment.projectId, projectId), eq(schema.environment.slug, envSlug.trim())),
    )
    .get();

  if (!env) throw new Error("Environment not found");
  return env;
}

export function resolveEnabled(
  toggle: ToggleRow,
  env: EnvironmentRow,
  defaultEnv: EnvironmentRow,
  override: { enabled: boolean } | null | undefined,
): { enabled: boolean; inherited: boolean } {
  if (env.id === defaultEnv.id) {
    return { enabled: toggle.enabled, inherited: false };
  }
  if (override) {
    return { enabled: override.enabled, inherited: false };
  }
  return { enabled: toggle.enabled, inherited: true };
}

export async function getToggleOverride(
  db: AgnosticDatabaseInstance<typeof schema>,
  toggleId: string,
  environmentId: string,
) {
  return db
    .select()
    .from(schema.toggleState)
    .where(
      and(
        eq(schema.toggleState.toggleId, toggleId),
        eq(schema.toggleState.environmentId, environmentId),
      ),
    )
    .get();
}
