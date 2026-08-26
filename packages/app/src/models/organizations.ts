import { signal, createModel } from "@preact/signals";
import {
  getOrganizations,
  createOrganization,
  getMembers,
  inviteMember,
  removeMember,
  getTeams,
  createTeam,
  addTeamMember,
  removeTeamMember,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceTeam,
  type WorkspaceTeamMember,
  type Invitation,
} from "../lib/api";

export const OrganizationsModel = createModel(() => {
  const loading = signal(false);
  const error = signal<string | null>(null);
  const orgs = signal<Workspace[]>([]);
  const currentOrg = signal<Workspace | null>(null);
  const members = signal<WorkspaceMember[]>([]);
  const invitations = signal<Invitation[]>([]);
  const teams = signal<WorkspaceTeam[]>([]);

  const fetchOrgs = async () => {
    loading.value = true;
    error.value = null;
    try {
      orgs.value = await getOrganizations();
      if (orgs.value.length > 0 && currentOrg.value === null) {
        currentOrg.value = orgs.value[0];
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load workspaces";
    } finally {
      loading.value = false;
    }
  };

  const createOrg = async (name: string, slug: string): Promise<Workspace | null> => {
    loading.value = true;
    error.value = null;
    try {
      const org = await createOrganization(name, slug);
      orgs.value = [org, ...orgs.value];
      currentOrg.value = org;
      return org;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create workspace";
      return null;
    } finally {
      loading.value = false;
    }
  };

  const fetchMembers = async (orgId: string) => {
    loading.value = true;
    error.value = null;
    try {
      const res = await getMembers(orgId);
      members.value = res.members;
      invitations.value = res.invitations;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load members";
    } finally {
      loading.value = false;
    }
  };

  const invite = async (orgId: string, email: string, role: "owner" | "member") => {
    error.value = null;
    try {
      await inviteMember(orgId, email, role);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to send invitation";
      throw err;
    }
  };

  const removeMemberById = async (orgId: string, memberId: string) => {
    const prev = members.value;
    members.value = prev.filter((m) => m.id !== memberId);
    try {
      await removeMember(orgId, memberId);
    } catch (err) {
      members.value = prev;
      error.value = err instanceof Error ? err.message : "Failed to remove member";
    }
  };

  const fetchTeams = async (orgId: string) => {
    loading.value = true;
    error.value = null;
    try {
      teams.value = await getTeams(orgId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load teams";
    } finally {
      loading.value = false;
    }
  };

  const createOrgTeam = async (orgId: string, name: string) => {
    error.value = null;
    try {
      const team = await createTeam(orgId, name);
      teams.value = [...teams.value, { ...team, members: [] }];
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create team";
      throw err;
    }
  };

  const addMemberToTeam = async (orgId: string, teamId: string, userId: string) => {
    error.value = null;
    // Find the org member record so we can include name/email in the optimistic update
    const orgMember = members.value.find((m) => m.userId === userId);
    const optimisticMember: WorkspaceTeamMember = {
      userId,
      name: orgMember?.name ?? "",
      email: orgMember?.email ?? "",
    };
    // Optimistically add the member to the team immediately
    teams.value = teams.value.map((t) =>
      t.id === teamId ? { ...t, members: [...t.members, optimisticMember] } : t,
    );
    try {
      await addTeamMember(orgId, teamId, userId);
    } catch (err) {
      // Rollback on failure
      teams.value = teams.value.map((t) =>
        t.id === teamId ? { ...t, members: t.members.filter((m) => m.userId !== userId) } : t,
      );
      error.value = err instanceof Error ? err.message : "Failed to add team member";
      throw err;
    }
  };

  const removeMemberFromTeam = async (orgId: string, teamId: string, userId: string) => {
    error.value = null;
    try {
      await removeTeamMember(orgId, teamId, userId);
      teams.value = teams.value.map((t) =>
        t.id === teamId ? { ...t, members: t.members.filter((m) => m.userId !== userId) } : t,
      );
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to remove team member";
      throw err;
    }
  };

  return {
    loading,
    error,
    orgs,
    currentOrg,
    members,
    invitations,
    teams,
    fetchOrgs,
    createOrg,
    fetchMembers,
    invite,
    removeMemberById,
    fetchTeams,
    createOrgTeam,
    addMemberToTeam,
    removeMemberFromTeam,
  };
});
