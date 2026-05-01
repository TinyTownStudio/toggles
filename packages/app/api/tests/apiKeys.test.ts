import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { apiDelete, apiGet, apiPatch, apiPost, signUp } from "./helpers";

let cookie = "";
let projectAId = "";
let projectBId = "";
let toggleId = "";
let scopedKey = ""; // scoped to projectA
let allProjectsKey = ""; // no project scope

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

  cookie = await signUp("test@example.com", "password1234", "Test User");

  const projARes = await apiPost("/api/v1/projects", { cookie, body: { name: "Project A" } });
  expect(projARes.status).toBe(201);
  projectAId = ((await projARes.json()) as { id: string }).id;

  const projBRes = await apiPost("/api/v1/projects", { cookie, body: { name: "Project B" } });
  expect(projBRes.status).toBe(201);
  projectBId = ((await projBRes.json()) as { id: string }).id;

  // Create a toggle in Project A
  const toggleRes = await apiPost(`/api/v1/projects/${projectAId}/toggles`, {
    cookie,
    body: { key: "my-flag" },
  });
  expect(toggleRes.status).toBe(201);
  toggleId = ((await toggleRes.json()) as { id: string }).id;

  // Create a project-scoped API key (scoped to Project A)
  const scopedKeyRes = await apiPost("/api/v1/api-keys", {
    cookie,
    body: { name: "Scoped Key", projectId: projectAId },
  });
  expect(scopedKeyRes.status).toBe(201);
  scopedKey = ((await scopedKeyRes.json()) as { key: string }).key;

  // Create an all-projects API key
  const allKeyRes = await apiPost("/api/v1/api-keys", {
    cookie,
    body: { name: "All-Projects Key", projectId: null },
  });
  expect(allKeyRes.status).toBe(201);
  allProjectsKey = ((await allKeyRes.json()) as { key: string }).key;
});

describe("session auth baseline", () => {
  it("GET /api/v1/projects returns own projects", async () => {
    const res = await apiGet("/api/v1/projects", { cookie });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { id: string }[];
    expect(data.map((p) => p.id)).toContain(projectAId);
    expect(data.map((p) => p.id)).toContain(projectBId);
  });

  it("GET /api/v1/projects/:id/toggles returns toggles", async () => {
    const res = await apiGet(`/api/v1/projects/${projectAId}/toggles`, { cookie });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { id: string }[];
    expect(data.map((t) => t.id)).toContain(toggleId);
  });

  it("PATCH toggle updates enabled flag", async () => {
    const res = await apiPatch(`/api/v1/projects/${projectAId}/toggles/${toggleId}`, {
      cookie,
      body: { enabled: true },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { enabled: boolean }).enabled).toBe(true);
  });

  it("PATCH toggle updates meta", async () => {
    const res = await apiPatch(`/api/v1/projects/${projectAId}/toggles/${toggleId}`, {
      cookie,
      body: { meta: { region: "us-east" } },
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { meta: Record<string, string> }).meta).toEqual({
      region: "us-east",
    });
  });
});

describe("project-scoped API key", () => {
  it("reads toggles from its own project", async () => {
    const res = await apiGet(`/api/v1/projects/${projectAId}/toggles`, {
      bearer: scopedKey,
    });
    expect(res.status).toBe(200);
  });

  it("cannot read toggles from a different project (403)", async () => {
    const res = await apiGet(`/api/v1/projects/${projectBId}/toggles`, {
      bearer: scopedKey,
    });
    expect(res.status).toBe(403);
  });

  it("cannot create a toggle (403)", async () => {
    const res = await apiPost(`/api/v1/projects/${projectAId}/toggles`, {
      bearer: scopedKey,
      body: { key: "should-fail" },
    });
    expect(res.status).toBe(403);
  });

  it("cannot evaluate a flag in a different project (403)", async () => {
    const res = await apiGet(`/api/v1/projects/${projectBId}/evaluate/my-flag`, {
      bearer: scopedKey,
    });
    expect(res.status).toBe(403);
  });

  it("cannot PATCH a toggle (403)", async () => {
    const res = await apiPatch(`/api/v1/projects/${projectAId}/toggles/${toggleId}`, {
      bearer: scopedKey,
      body: { enabled: false },
    });
    expect(res.status).toBe(403);
  });

  it("cannot DELETE a toggle (403)", async () => {
    const res = await apiDelete(`/api/v1/projects/${projectAId}/toggles/${toggleId}`, {
      bearer: scopedKey,
    });
    expect(res.status).toBe(403);
  });
});

describe("all-projects API key", () => {
  it("reads toggles from any project", async () => {
    const resA = await apiGet(`/api/v1/projects/${projectAId}/toggles`, {
      bearer: allProjectsKey,
    });
    expect(resA.status).toBe(200);

    const resB = await apiGet(`/api/v1/projects/${projectBId}/toggles`, {
      bearer: allProjectsKey,
    });
    expect(resB.status).toBe(200);
  });

  it("cannot write toggles (403)", async () => {
    const res = await apiPost(`/api/v1/projects/${projectAId}/toggles`, {
      bearer: allProjectsKey,
      body: { key: "should-fail" },
    });
    expect(res.status).toBe(403);
  });

  it("evaluates a toggle in OpenFeature shape", async () => {
    const res = await apiGet(`/api/v1/projects/${projectAId}/evaluate/my-flag`, {
      bearer: allProjectsKey,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      key: string;
      value: boolean;
      variant: string;
      reason: string;
      metadata: { projectId: string };
    };

    expect(data.key).toBe("my-flag");
    expect(typeof data.value).toBe("boolean");
    expect(data.variant === "on" || data.variant === "off").toBe(true);
    expect(data.reason).toBe("STATIC");
    expect(data.metadata.projectId).toBe(projectAId);
  });

  it("returns 404 for a missing evaluate flag", async () => {
    const res = await apiGet(`/api/v1/projects/${projectAId}/evaluate/does-not-exist`, {
      bearer: allProjectsKey,
    });
    expect(res.status).toBe(404);
  });
});

describe("invalid credentials", () => {
  it("no auth returns 401", async () => {
    const res = await apiGet(`/api/v1/projects/${projectAId}/toggles`);
    expect(res.status).toBe(401);
  });

  it("bad Bearer token returns 401", async () => {
    const res = await apiGet(`/api/v1/projects/${projectAId}/toggles`, {
      bearer: "not-a-real-key",
    });
    expect(res.status).toBe(401);
  });

  it("evaluate endpoint with no auth returns 401", async () => {
    const res = await apiGet(`/api/v1/projects/${projectAId}/evaluate/my-flag`);
    expect(res.status).toBe(401);
  });
});
