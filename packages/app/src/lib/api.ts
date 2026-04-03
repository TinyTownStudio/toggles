import { API_BASE_URL } from "./constants";

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
