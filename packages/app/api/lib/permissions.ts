export type TokenType = "read" | "admin";

/**
 * Builds the BetterAuth permissions object from a token type and optional project scope.
 *
 * Examples:
 *   buildPermissions("read", null)   → { projects: ["read"] }
 *   buildPermissions("read", "abc")  → { projects: ["read.abc"] }
 *   buildPermissions("read", "abc", "staging") → { projects: ["read.abc"], environments: ["staging"] }
 *   buildPermissions("admin", null)  → { projects: ["read", "write"] }
 *   buildPermissions("admin", "abc") → { projects: ["read.abc", "write.abc"] }
 */
export function buildPermissions(
  type: TokenType,
  projectId: string | null,
  environmentSlug?: string | null,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  if (projectId) {
    const actions: string[] =
      type === "admin" ? [`read.${projectId}`, `write.${projectId}`] : [`read.${projectId}`];
    result.projects = actions;
  } else {
    const actions: string[] = type === "admin" ? ["read", "write"] : ["read"];
    result.projects = actions;
  }

  if (environmentSlug?.trim()) {
    result.environments = [environmentSlug.trim()];
  }

  return result;
}

/**
 * Returns true if the permissions grant write access to the given project.
 * Grants access when either "write" (all-projects) or "write.<projectId>" is present.
 */
export function hasWriteAccess(
  permissions: Record<string, string[]> | null,
  projectId: string,
): boolean {
  const actions = permissions?.projects ?? [];
  return actions.includes("write") || actions.includes(`write.${projectId}`);
}

/**
 * Returns true if the API key is scoped to a specific project that doesn't match
 * the requested projectId. Session callers (permissions === null) are never blocked.
 */
export function isScopeViolation(
  permissions: Record<string, string[]> | null,
  projectId: string,
): boolean {
  if (!permissions) return false;
  const actions = permissions.projects ?? [];
  const hasGlobalRead = actions.includes("read");
  const hasGlobalWrite = actions.includes("write");
  if (hasGlobalRead || hasGlobalWrite) return false;
  const matchesProject = actions.some(
    (a) => a === `read.${projectId}` || a === `write.${projectId}`,
  );
  return !matchesProject;
}

/**
 * Returns true if the API key is scoped to a specific environment that doesn't
 * match the requested env slug. Keys without an environments array are not blocked.
 */
export function isEnvScopeViolation(
  permissions: Record<string, string[]> | null,
  envSlug: string,
): boolean {
  if (!permissions) return false;
  const envs = permissions.environments;
  if (!envs || envs.length === 0) return false;
  return !envs.includes(envSlug);
}

/**
 * Derives the token type from a stored permissions object.
 * Any "write" entry (global or scoped) means admin.
 */
export function deriveTokenType(permissions: Record<string, string[]> | null): TokenType {
  const actions = permissions?.projects ?? [];
  const isAdmin = actions.some((a) => a === "write" || a.startsWith("write."));
  return isAdmin ? "admin" : "read";
}
