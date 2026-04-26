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

export async function getProjects(search?: string): Promise<Project[]> {
  const params = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return fetchApi<Project[]>(`/api/v1/projects${params}`);
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

export async function getToggles(projectId: string, search?: string): Promise<Toggle[]> {
  const params = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  return fetchApi<Toggle[]>(`/api/v1/projects/${projectId}/toggles${params}`);
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
