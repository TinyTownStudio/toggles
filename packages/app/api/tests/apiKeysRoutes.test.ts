import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { apiDelete, apiGet, apiPost, signUp } from "./helpers";

describe("API key routes", () => {
  let ownerCookie = "";
  let otherCookie = "";
  let projectId = "";

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    ownerCookie = await signUp("owner@apikeys.test", "password1234", "Owner");
    otherCookie = await signUp("other@apikeys.test", "password1234", "Other");

    const projectRes = await apiPost("/api/v1/projects", {
      cookie: ownerCookie,
      body: { name: "Keys Project" },
    });
    expect(projectRes.status).toBe(201);
    projectId = ((await projectRes.json()) as { id: string }).id;
  });

  it("GET /api/v1/api-keys returns 401 without a session", async () => {
    const res = await apiGet("/api/v1/api-keys");
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/api-keys returns 401 without a session", async () => {
    const res = await apiPost("/api/v1/api-keys", { body: { name: "Nope" } });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/v1/api-keys/:id returns 401 without a session", async () => {
    const res = await apiDelete("/api/v1/api-keys/some-id");
    expect(res.status).toBe(401);
  });

  it("creates, lists, and revokes API keys", async () => {
    const createRes = await apiPost("/api/v1/api-keys", {
      cookie: ownerCookie,
      body: { name: "  List Me  ", type: "admin" },
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      id: string;
      key: string;
      name: string;
      type: string;
      permissions: Record<string, string[]>;
    };
    expect(created.name).toBe("List Me");
    expect(created.key).toBeTruthy();
    expect(created.type).toBe("admin");
    expect(created.permissions.projects).toContain("read");
    expect(created.permissions.projects).toContain("write");

    const listRes = await apiGet("/api/v1/api-keys", { cookie: ownerCookie });
    expect(listRes.status).toBe(200);
    const listed = (await listRes.json()) as {
      id: string;
      name: string;
      key?: string;
      type: string;
      permissions: Record<string, string[]> | null;
    }[];
    const row = listed.find((k) => k.id === created.id);
    expect(row).toBeDefined();
    expect(row?.name).toBe("List Me");
    expect(row?.type).toBe("admin");
    expect(row?.key).toBeUndefined();

    const deleteRes = await apiDelete(`/api/v1/api-keys/${created.id}`, { cookie: ownerCookie });
    expect(deleteRes.status).toBe(204);

    const afterList = await apiGet("/api/v1/api-keys", { cookie: ownerCookie });
    const afterRows = (await afterList.json()) as { id: string }[];
    expect(afterRows.some((k) => k.id === created.id)).toBe(false);
  });

  it("defaults unnamed keys and read type", async () => {
    const res = await apiPost("/api/v1/api-keys", {
      cookie: ownerCookie,
      body: { name: "   " },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { name: string; type: string };
    expect(body.name).toBe("Unnamed");
    expect(body.type).toBe("read");
  });

  it("creates a project-scoped read key", async () => {
    const res = await apiPost("/api/v1/api-keys", {
      cookie: ownerCookie,
      body: { name: "Scoped", projectId, type: "read" },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      type: string;
      permissions: Record<string, string[]>;
    };
    expect(body.type).toBe("read");
    expect(body.permissions.projects).toEqual([`read.${projectId}`]);
  });

  it("rejects environmentSlug without projectId", async () => {
    const res = await apiPost("/api/v1/api-keys", {
      cookie: ownerCookie,
      body: { name: "Bad", environmentSlug: "staging" },
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe(
      "environmentSlug requires projectId",
    );
  });

  it("returns 404 for an unknown project", async () => {
    const res = await apiPost("/api/v1/api-keys", {
      cookie: ownerCookie,
      body: { name: "Missing", projectId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe("Project not found");
  });

  it("returns 404 for an unknown environment slug", async () => {
    const res = await apiPost("/api/v1/api-keys", {
      cookie: ownerCookie,
      body: { name: "Bad Env", projectId, environmentSlug: "not-a-real-env" },
    });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { error: string }).error).toBe("Environment not found");
  });

  it("creates an environment-scoped key when the slug exists", async () => {
    const envRes = await apiGet(`/api/v1/projects/${projectId}/environments`, {
      cookie: ownerCookie,
    });
    expect(envRes.status).toBe(200);

    const res = await apiPost("/api/v1/api-keys", {
      cookie: ownerCookie,
      body: { name: "Prod Key", projectId, environmentSlug: "production" },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { permissions: Record<string, string[]> };
    expect(body.permissions.environments).toEqual(["production"]);
  });

  it("DELETE returns 404 for a missing key", async () => {
    const res = await apiDelete("/api/v1/api-keys/does-not-exist", { cookie: ownerCookie });
    expect(res.status).toBe(404);
  });

  it("DELETE returns 404 when revoking another user's key", async () => {
    const createRes = await apiPost("/api/v1/api-keys", {
      cookie: ownerCookie,
      body: { name: "Private" },
    });
    expect(createRes.status).toBe(201);
    const { id } = (await createRes.json()) as { id: string };

    const res = await apiDelete(`/api/v1/api-keys/${id}`, { cookie: otherCookie });
    expect(res.status).toBe(404);
  });
});
