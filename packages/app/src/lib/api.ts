import { API_BASE_URL } from "./constants";

export type TokenType = "read" | "admin";

export interface ApiKeyItem {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  expiresAt: number | null;
  enabled: boolean;
  permissions: Record<string, string[]> | null;
  type: TokenType;
}

export interface Toggle {
  id: string;
  key: string;
  enabled: boolean;
  projectId: string;
  meta: Record<string, string> | null;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  userId: string;
  organizationId: string | null;
  teamId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SubscriptionResponse {
  plan: "free" | "pro";
  limits: Record<string, unknown>;
  beta: Record<string, boolean>;
}

export interface DashboardFlagEntry {
  id: string;
  key: string;
  projectId: string;
  projectName: string;
  enabled: boolean;
  updatedAt: number;
  createdAt: number;
}

export interface DashboardProjectEntry {
  projectId: string;
  projectName: string;
  totalFlags: number;
  enabledFlags: number;
}

export interface DashboardResponse {
  totalProjects: number;
  totalFlags: number;
  enabledFlags: number;
  disabledFlags: number;
  totalApiKeys: number;
  activeApiKeys: number;
  unusedApiKeys: number;
  expiringApiKeys: number;
  recentlyModified: DashboardFlagEntry[];
  staleFlags: DashboardFlagEntry[];
  flagsPerProject: DashboardProjectEntry[];
  plan: "free" | "pro";
  limits: Record<string, unknown>;
  beta: Record<string, boolean>;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");

  if (!response.ok) {
    const error = isJson
      ? await response.json().catch(() => ({ error: "Request failed" }))
      : { error: "Request failed" };
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return isJson ? response.json() : (undefined as T);
}

export async function getSubscription(): Promise<SubscriptionResponse> {
  return fetchApi<SubscriptionResponse>("/api/v1/subscription");
}

export async function getPortalUrl(): Promise<{ url: string }> {
  return fetchApi<{ url: string }>("/api/v1/portal");
}

export async function getProjects(): Promise<Project[]> {
  return fetchApi<Project[]>("/api/v1/projects");
}

export async function createProject(name: string): Promise<Project> {
  return fetchApi<Project>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await fetchApi<void>(`/api/v1/projects/${id}`, { method: "DELETE" });
}

export async function getToggles(projectId: string): Promise<Toggle[]> {
  return fetchApi<Toggle[]>(`/api/v1/projects/${projectId}/toggles`);
}

export async function createToggle(projectId: string, key: string): Promise<Toggle> {
  return fetchApi<Toggle>(`/api/v1/projects/${projectId}/toggles`, {
    method: "POST",
    body: JSON.stringify({ key }),
  });
}

export async function updateToggle(
  projectId: string,
  id: string,
  enabled: boolean,
): Promise<Toggle> {
  return fetchApi<Toggle>(`/api/v1/projects/${projectId}/toggles/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export async function updateToggleMeta(
  projectId: string,
  id: string,
  meta: Record<string, string>,
): Promise<Toggle> {
  return fetchApi<Toggle>(`/api/v1/projects/${projectId}/toggles/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ meta }),
  });
}

export async function deleteToggle(projectId: string, id: string): Promise<void> {
  await fetchApi<void>(`/api/v1/projects/${projectId}/toggles/${id}`, { method: "DELETE" });
}

export async function createApiKey(
  name: string,
  projectId: string | null,
  type: TokenType = "read",
): Promise<{ key: string } & ApiKeyItem> {
  return fetchApi<{ key: string } & ApiKeyItem>("/api/v1/api-keys", {
    method: "POST",
    body: JSON.stringify({ name, projectId, type }),
  });
}

export async function listApiKeys(): Promise<ApiKeyItem[]> {
  return fetchApi<ApiKeyItem[]>("/api/v1/api-keys");
}

export async function deleteApiKey(id: string): Promise<void> {
  await fetchApi<void>(`/api/v1/api-keys/${id}`, { method: "DELETE" });
}

export async function getDashboard(): Promise<DashboardResponse> {
  return fetchApi<DashboardResponse>("/api/v1/dashboard");
}

// --- Organizations / Workspaces ---

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: number;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "owner" | "member";
  joinedAt: number;
}

export interface WorkspaceTeamMember {
  userId: string;
  name: string;
  email: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: "owner" | "member";
  status: "pending" | "accepted" | "rejected" | "canceled";
  createdAt: number;
}

export interface WorkspaceTeam {
  id: string;
  name: string;
  organizationId: string;
  createdAt: number;
  members: WorkspaceTeamMember[];
}

export async function getOrganizations(): Promise<Workspace[]> {
  return fetchApi<Workspace[]>("/api/v1/organizations");
}

export async function createOrganization(name: string, slug: string): Promise<Workspace> {
  return fetchApi<Workspace>("/api/v1/organizations", {
    method: "POST",
    body: JSON.stringify({ name, slug }),
  });
}

export async function getMembers(
  orgId: string,
): Promise<{ members: WorkspaceMember[]; invitations: Invitation[] }> {
  return fetchApi<{ members: WorkspaceMember[]; invitations: Invitation[] }>(
    `/api/v1/organizations/${orgId}/members`,
  );
}

export async function inviteMember(
  orgId: string,
  email: string,
  role: "owner" | "member",
): Promise<void> {
  await fetchApi<void>(`/api/v1/organizations/${orgId}/invite`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function removeMember(orgId: string, memberId: string): Promise<void> {
  await fetchApi<void>(`/api/v1/organizations/${orgId}/members/${memberId}`, {
    method: "DELETE",
  });
}

export async function getTeams(orgId: string): Promise<WorkspaceTeam[]> {
  return fetchApi<WorkspaceTeam[]>(`/api/v1/organizations/${orgId}/teams`);
}

export async function createTeam(orgId: string, name: string): Promise<WorkspaceTeam> {
  return fetchApi<WorkspaceTeam>(`/api/v1/organizations/${orgId}/teams`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function addTeamMember(orgId: string, teamId: string, userId: string): Promise<void> {
  await fetchApi<void>(`/api/v1/organizations/${orgId}/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function removeTeamMember(
  orgId: string,
  teamId: string,
  userId: string,
): Promise<void> {
  await fetchApi<void>(`/api/v1/organizations/${orgId}/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
  });
}

export async function createProjectWithOrg(
  name: string,
  organizationId?: string,
  teamId?: string,
): Promise<Project> {
  return fetchApi<Project>("/api/v1/projects", {
    method: "POST",
    body: JSON.stringify({ name, organizationId, teamId }),
  });
}

export async function updateProject(
  id: string,
  organizationId: string | null,
  teamId: string | null,
): Promise<Project> {
  return fetchApi<Project>(`/api/v1/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ organizationId, teamId }),
  });
}
