export type WorkspaceMemberRole = "owner" | "admin" | "member";

const WORKSPACE_ROLES: WorkspaceMemberRole[] = ["owner", "admin", "member"];

export function parseWorkspaceMemberRole(value: unknown): WorkspaceMemberRole | null {
  if (typeof value !== "string") return null;
  const role = value.trim().toLowerCase();
  return WORKSPACE_ROLES.includes(role as WorkspaceMemberRole)
    ? (role as WorkspaceMemberRole)
    : null;
}

export function isWorkspaceOwnerRole(role: string): boolean {
  return role === "owner";
}
