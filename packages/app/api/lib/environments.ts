import { eq, and } from "drizzle-orm";
import * as schema from "../db/schema";
import type { AgnosticDatabaseInstance } from "../types";

export type EnvironmentRow = typeof schema.environment.$inferSelect;

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

export async function getToggleState(
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

export async function resolveToggleForEnv(
  db: AgnosticDatabaseInstance<typeof schema>,
  toggleId: string,
  environmentId: string,
): Promise<{ enabled: boolean; meta: Record<string, string> | null }> {
  const state = await getToggleState(db, toggleId, environmentId);
  return {
    enabled: state?.enabled ?? false,
    meta: (state?.meta as Record<string, string> | null) ?? null,
  };
}

export async function upsertToggleState(
  db: AgnosticDatabaseInstance<typeof schema>,
  toggleId: string,
  environmentId: string,
  patch: { enabled?: boolean; meta?: Record<string, string> | null },
) {
  const now = new Date();
  const existing = await getToggleState(db, toggleId, environmentId);

  if (existing) {
    await db
      .update(schema.toggleState)
      .set({
        ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
        ...("meta" in patch ? { meta: patch.meta } : {}),
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.toggleState.toggleId, toggleId),
          eq(schema.toggleState.environmentId, environmentId),
        ),
      );
    return;
  }

  await db.insert(schema.toggleState).values({
    toggleId,
    environmentId,
    enabled: patch.enabled ?? false,
    meta: "meta" in patch ? patch.meta : null,
    updatedAt: now,
  });
}

export async function seedToggleStatesForToggle(
  db: AgnosticDatabaseInstance<typeof schema>,
  projectId: string,
  toggleId: string,
  initial: { enabled: boolean; meta?: Record<string, string> | null },
) {
  await ensureDefaultEnvironment(db, projectId);
  const envs = await listProjectEnvironments(db, projectId);
  const now = new Date();

  for (const env of envs) {
    const existing = await getToggleState(db, toggleId, env.id);
    if (existing) continue;

    await db.insert(schema.toggleState).values({
      toggleId,
      environmentId: env.id,
      enabled: initial.enabled,
      meta: initial.meta ?? null,
      updatedAt: now,
    });
  }
}

export async function seedToggleStatesForEnvironment(
  db: AgnosticDatabaseInstance<typeof schema>,
  projectId: string,
  environmentId: string,
) {
  const toggles = await db
    .select()
    .from(schema.toggle)
    .where(eq(schema.toggle.projectId, projectId))
    .all();

  const now = new Date();

  for (const toggle of toggles) {
    const existing = await getToggleState(db, toggle.id, environmentId);
    if (existing) continue;

    await db.insert(schema.toggleState).values({
      toggleId: toggle.id,
      environmentId,
      enabled: false,
      meta: null,
      updatedAt: now,
    });
  }
}
