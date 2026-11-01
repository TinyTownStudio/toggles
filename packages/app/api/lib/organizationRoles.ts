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

export function isWorkspaceAdminRole(role: string): boolean {
  return role === "admin";
}

/** Owners and admins can invite, manage teams, and revoke pending invites. */
export function canManageWorkspace(role: string): boolean {
  return role === "owner" || role === "admin";
}

export function canAssignInviteRole(callerRole: string, inviteRole: WorkspaceMemberRole): boolean {
  if (callerRole === "owner") return true;
  if (callerRole === "admin") return inviteRole === "member" || inviteRole === "admin";
  return false;
}

export function canRemoveWorkspaceMember(
  callerRole: string,
  targetRole: string,
): { allowed: boolean; reason?: string } {
  if (!canManageWorkspace(callerRole)) {
    return { allowed: false, reason: "Forbidden" };
  }
  if (callerRole === "admin") {
    if (targetRole !== "member") {
      return { allowed: false, reason: "Forbidden" };
    }
  }
  return { allowed: true };
}
