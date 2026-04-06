import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { apiGet, apiPost, apiPatch, signUp } from "./helpers";

interface DashboardResponse {
  totalProjects: number;
  totalFlags: number;
  enabledFlags: number;
  disabledFlags: number;
  totalApiKeys: number;
  activeApiKeys: number;
  unusedApiKeys: number;
  expiringApiKeys: number;
  recentlyModified: {
    id: string;
    key: string;
    projectId: string;
    projectName: string;
    enabled: boolean;
    updatedAt: number;
  }[];
  staleFlags: { id: string; key: string }[];
  flagsPerProject: {
    projectId: string;
    projectName: string;
    totalFlags: number;
    enabledFlags: number;
  }[];
  plan: string;
  limits: Record<string, unknown>;
}

let cookie = "";
let projectAId = "";
let projectBId = "";
let toggleAId = "";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

  cookie = await signUp("dash@example.com", "password1234", "Dash User");

  const projARes = await apiPost("/api/v1/projects", { cookie, body: { name: "Alpha" } });
  expect(projARes.status).toBe(201);
  projectAId = ((await projARes.json()) as { id: string }).id;

  const projBRes = await apiPost("/api/v1/projects", { cookie, body: { name: "Beta" } });
  expect(projBRes.status).toBe(201);
  projectBId = ((await projBRes.json()) as { id: string }).id;

  // Create two flags in Alpha — one enabled, one disabled
  const t1Res = await apiPost(`/api/v1/projects/${projectAId}/toggles`, {
    cookie,
    body: { key: "flag-enabled" },
  });
  expect(t1Res.status).toBe(201);
  toggleAId = ((await t1Res.json()) as { id: string }).id;

  // Enable the first flag
  await apiPatch(`/api/v1/projects/${projectAId}/toggles/${toggleAId}`, {
    cookie,
    body: { enabled: true },
  });

  const t2Res = await apiPost(`/api/v1/projects/${projectAId}/toggles`, {
    cookie,
    body: { key: "flag-disabled" },
  });
  expect(t2Res.status).toBe(201);

  // Create one flag in Beta
  await apiPost(`/api/v1/projects/${projectBId}/toggles`, {
    cookie,
    body: { key: "beta-flag" },
  });

  // Create an API key
  await apiPost("/api/v1/api-keys", {
    cookie,
    body: { name: "My Key", projectId: null },
  });
});

describe("GET /api/v1/dashboard", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await apiGet("/api/v1/dashboard");
    expect(res.status).toBe(401);
  });

  it("returns correct project and flag counts", async () => {
    const res = await apiGet("/api/v1/dashboard", { cookie });
    expect(res.status).toBe(200);

    const data = (await res.json()) as DashboardResponse;

    expect(data.totalProjects).toBe(2);
    expect(data.totalFlags).toBe(3); // 2 in Alpha + 1 in Beta
    expect(data.enabledFlags).toBe(1);
    expect(data.disabledFlags).toBe(2);
  });

  it("returns correct API key stats", async () => {
    const res = await apiGet("/api/v1/dashboard", { cookie });
    expect(res.status).toBe(200);

    const data = (await res.json()) as DashboardResponse;

    expect(data.totalApiKeys).toBe(1);
    expect(data.activeApiKeys).toBe(1);
    expect(data.unusedApiKeys).toBe(1); // never used yet
  });

  it("populates recentlyModified with correct flags", async () => {
    const res = await apiGet("/api/v1/dashboard", { cookie });
    expect(res.status).toBe(200);

    const data = (await res.json()) as DashboardResponse;

    expect(data.recentlyModified.length).toBeGreaterThan(0);
    expect(data.recentlyModified.length).toBeLessThanOrEqual(5);

    // All entries must have the required fields
    for (const flag of data.recentlyModified) {
      expect(flag).toHaveProperty("id");
      expect(flag).toHaveProperty("key");
      expect(flag).toHaveProperty("projectId");
      expect(flag).toHaveProperty("projectName");
      expect(typeof flag.enabled).toBe("boolean");
    }
  });

  it("includes projectName in recentlyModified entries", async () => {
    const res = await apiGet("/api/v1/dashboard", { cookie });
    const data = (await res.json()) as DashboardResponse;

    const names = data.recentlyModified.map((f) => f.projectName);
    // At least one flag from Alpha should appear
    expect(names).toContain("Alpha");
  });

  it("returns flagsPerProject with correct totals", async () => {
    const res = await apiGet("/api/v1/dashboard", { cookie });
    expect(res.status).toBe(200);

    const data = (await res.json()) as DashboardResponse;

    expect(data.flagsPerProject.length).toBe(2);

    const alpha = data.flagsPerProject.find((p) => p.projectName === "Alpha");
    expect(alpha).toBeDefined();
    expect(alpha?.totalFlags).toBe(2);
    expect(alpha?.enabledFlags).toBe(1);

    const beta = data.flagsPerProject.find((p) => p.projectName === "Beta");
    expect(beta).toBeDefined();
    expect(beta?.totalFlags).toBe(1);
    expect(beta?.enabledFlags).toBe(0);
  });

  it("returns empty stale flags for freshly created flags", async () => {
    const res = await apiGet("/api/v1/dashboard", { cookie });
    const data = (await res.json()) as DashboardResponse;

    // All flags were just created — none should be stale
    expect(data.staleFlags.length).toBe(0);
  });

  it("returns plan info", async () => {
    const res = await apiGet("/api/v1/dashboard", { cookie });
    const data = (await res.json()) as DashboardResponse;

    expect(data.plan).toBe("free");
    expect(data.limits).toBeDefined();
  });

  it("returns zero counts for a user with no data", async () => {
    const emptyCookie = await signUp("empty@example.com", "password1234", "Empty User");

    const res = await apiGet("/api/v1/dashboard", { cookie: emptyCookie });
    expect(res.status).toBe(200);

    const data = (await res.json()) as DashboardResponse;

    expect(data.totalProjects).toBe(0);
    expect(data.totalFlags).toBe(0);
    expect(data.enabledFlags).toBe(0);
    expect(data.disabledFlags).toBe(0);
    expect(data.totalApiKeys).toBe(0);
    expect(data.recentlyModified).toEqual([]);
    expect(data.staleFlags).toEqual([]);
    expect(data.flagsPerProject).toEqual([]);
  });
});
