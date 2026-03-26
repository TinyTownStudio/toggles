import { API_BASE_URL } from "./constants";

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

async function fetchApi<T>(
	endpoint: string,
	options?: RequestInit,
): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: "Request failed" }));
		throw new Error(error.error || `HTTP ${response.status}`);
	}

	return response.json();
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
