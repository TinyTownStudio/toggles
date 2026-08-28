import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { apiDelete, apiGet, apiPatch, apiPost, signUp } from "./helpers";

let cookie = "";
let projectId = "";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

  cookie = await signUp("envs@example.com", "password1234", "Env User");

  const projRes = await apiPost("/api/v1/projects", { cookie, body: { name: "Env Project" } });
  expect(projRes.status).toBe(201);
  projectId = ((await projRes.json()) as { id: string }).id;
});

describe("GET /api/v1/projects/:projectId/environments", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/environments`);
    expect(res.status).toBe(401);
  });

  it("lazily creates default production environment", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/environments`, { cookie });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { slug: string; isDefault: boolean; name: string }[];
    expect(data.length).toBe(1);
    expect(data[0].slug).toBe("production");
    expect(data[0].isDefault).toBe(true);
    expect(data[0].name).toBe("Production");
  });
});

describe("POST /api/v1/projects/:projectId/environments", () => {
  it("creates a new environment", async () => {
    const res = await apiPost(`/api/v1/projects/${projectId}/environments`, {
      cookie,
      body: { name: "Staging" },
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { slug: string; isDefault: boolean };
    expect(data.slug).toBe("staging");
    expect(data.isDefault).toBe(false);
  });

  it("returns 409 for duplicate slug", async () => {
    const res = await apiPost(`/api/v1/projects/${projectId}/environments`, {
      cookie,
      body: { name: "Staging Again", slug: "staging" },
    });
    expect(res.status).toBe(409);
  });

  it("returns 403 when free plan limit is reached", async () => {
    const res = await apiPost(`/api/v1/projects/${projectId}/environments`, {
      cookie,
      body: { name: "Development" },
    });
    expect(res.status).toBe(201);

    const limitRes = await apiPost(`/api/v1/projects/${projectId}/environments`, {
      cookie,
      body: { name: "QA" },
    });
    expect(limitRes.status).toBe(403);
    const data = (await limitRes.json()) as { error: string };
    expect(data.error).toBe("Environment limit reached for your plan");
  });
});

describe("toggle values across environments", () => {
  let toggleId = "";

  beforeAll(async () => {
    const toggleRes = await apiPost(`/api/v1/projects/${projectId}/toggles`, {
      cookie,
      body: { key: "env-flag", enabled: false },
    });
    toggleId = ((await toggleRes.json()) as { id: string }).id;
  });

  it("seeds the same initial enabled value for production and staging", async () => {
    const prodRes = await apiGet(`/api/v1/projects/${projectId}/toggles?env=production`, {
      cookie,
    });
    const stagingRes = await apiGet(`/api/v1/projects/${projectId}/toggles?env=staging`, {
      cookie,
    });
    expect(prodRes.status).toBe(200);
    expect(stagingRes.status).toBe(200);

    const prod = ((await prodRes.json()) as { key: string; enabled: boolean }[]).find(
      (t) => t.key === "env-flag",
    );
    const staging = ((await stagingRes.json()) as { key: string; enabled: boolean }[]).find(
      (t) => t.key === "env-flag",
    );
    expect(prod?.enabled).toBe(false);
    expect(staging?.enabled).toBe(false);
  });

  it("PATCH on staging only enables staging", async () => {
    const patchRes = await apiPatch(
      `/api/v1/projects/${projectId}/toggles/${toggleId}?env=staging`,
      {
        cookie,
        body: { enabled: true },
      },
    );
    expect(patchRes.status).toBe(200);

    const prodRes = await apiGet(`/api/v1/projects/${projectId}/toggles?env=production`, {
      cookie,
    });
    const stagingRes = await apiGet(`/api/v1/projects/${projectId}/toggles?env=staging`, {
      cookie,
    });
    const prod = ((await prodRes.json()) as { key: string; enabled: boolean }[]).find(
      (t) => t.key === "env-flag",
    );
    const staging = ((await stagingRes.json()) as { key: string; enabled: boolean }[]).find(
      (t) => t.key === "env-flag",
    );
    expect(prod?.enabled).toBe(false);
    expect(staging?.enabled).toBe(true);
  });

  it("PATCH meta on staging only updates staging meta", async () => {
    await apiPatch(`/api/v1/projects/${projectId}/toggles/${toggleId}?env=production`, {
      cookie,
      body: { meta: { region: "us-east" } },
    });

    const patchRes = await apiPatch(
      `/api/v1/projects/${projectId}/toggles/${toggleId}?env=staging`,
      {
        cookie,
        body: { meta: { region: "eu-west" } },
      },
    );
    expect(patchRes.status).toBe(200);

    const prodRes = await apiGet(`/api/v1/projects/${projectId}/toggles?env=production`, {
      cookie,
    });
    const stagingRes = await apiGet(`/api/v1/projects/${projectId}/toggles?env=staging`, {
      cookie,
    });
    const prod = ((await prodRes.json()) as { key: string; meta: Record<string, string> | null }[]).find(
      (t) => t.key === "env-flag",
    );
    const staging = (
      (await stagingRes.json()) as { key: string; meta: Record<string, string> | null }[]
    ).find((t) => t.key === "env-flag");
    expect(prod?.meta).toEqual({ region: "us-east" });
    expect(staging?.meta).toEqual({ region: "eu-west" });
  });

  it("GET /toggles/one resolves env with flag query", async () => {
    const res = await apiGet(
      `/api/v1/projects/${projectId}/toggles/one?flag=env-flag&env=staging`,
      { cookie },
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { enabled: boolean; environment: string };
    expect(data.enabled).toBe(true);
    expect(data.environment).toBe("staging");
  });

  it("new environment seeds existing flags as disabled", async () => {
    const createRes = await apiPost("/api/v1/projects", {
      cookie,
      body: { name: "Seed Env Proj" },
    });
    const pid = ((await createRes.json()) as { id: string }).id;

    await apiGet(`/api/v1/projects/${pid}/environments`, { cookie });
    await apiPost(`/api/v1/projects/${pid}/toggles`, {
      cookie,
      body: { key: "seed-flag", enabled: true },
    });

    await apiPost(`/api/v1/projects/${pid}/environments`, {
      cookie,
      body: { name: "QA" },
    });

    const qaRes = await apiGet(`/api/v1/projects/${pid}/toggles?env=qa`, { cookie });
    const qaFlag = ((await qaRes.json()) as { key: string; enabled: boolean }[]).find(
      (t) => t.key === "seed-flag",
    );
    expect(qaFlag?.enabled).toBe(false);

    const prodRes = await apiGet(`/api/v1/projects/${pid}/toggles?env=production`, { cookie });
    const prodFlag = ((await prodRes.json()) as { key: string; enabled: boolean }[]).find(
      (t) => t.key === "seed-flag",
    );
    expect(prodFlag?.enabled).toBe(true);
  });
});

describe("DELETE /api/v1/projects/:projectId/environments/:id", () => {
  it("cannot delete default environment", async () => {
    const envsRes = await apiGet(`/api/v1/projects/${projectId}/environments`, { cookie });
    const envs = (await envsRes.json()) as { id: string; isDefault: boolean }[];
    const defaultEnv = envs.find((e) => e.isDefault)!;

    const res = await apiDelete(`/api/v1/projects/${projectId}/environments/${defaultEnv.id}`, {
      cookie,
    });
    expect(res.status).toBe(400);
  });

  it("deletes non-default environment", async () => {
    const createRes = await apiPost("/api/v1/projects", {
      cookie,
      body: { name: "Delete Env Proj" },
    });
    const pid = ((await createRes.json()) as { id: string }).id;

    await apiGet(`/api/v1/projects/${pid}/environments`, { cookie });
    const createEnvRes = await apiPost(`/api/v1/projects/${pid}/environments`, {
      cookie,
      body: { name: "Temp" },
    });
    const envRow = (await createEnvRes.json()) as { id: string };

    const res = await apiDelete(`/api/v1/projects/${pid}/environments/${envRow.id}`, { cookie });
    expect(res.status).toBe(204);
  });
});

describe("PATCH /api/v1/projects/:projectId/environments/:id", () => {
  it("promotes a new default environment", async () => {
    const createRes = await apiPost("/api/v1/projects", { cookie, body: { name: "Promote Proj" } });
    const pid = ((await createRes.json()) as { id: string }).id;

    await apiGet(`/api/v1/projects/${pid}/environments`, { cookie });
    const stagingRes = await apiPost(`/api/v1/projects/${pid}/environments`, {
      cookie,
      body: { name: "Staging" },
    });
    const staging = (await stagingRes.json()) as { id: string };

    const toggleRes = await apiPost(`/api/v1/projects/${pid}/toggles`, {
      cookie,
      body: { key: "promote-flag", enabled: false },
    });
    const toggle = (await toggleRes.json()) as { id: string };

    await apiPatch(`/api/v1/projects/${pid}/toggles/${toggle.id}?env=staging`, {
      cookie,
      body: { enabled: true },
    });

    const patchRes = await apiPatch(`/api/v1/projects/${pid}/environments/${staging.id}`, {
      cookie,
      body: { isDefault: true },
    });
    expect(patchRes.status).toBe(200);
    const updated = (await patchRes.json()) as { isDefault: boolean };
    expect(updated.isDefault).toBe(true);

    const listRes = await apiGet(`/api/v1/projects/${pid}/toggles`, { cookie });
    const list = (await listRes.json()) as { key: string; enabled: boolean }[];
    const flag = list.find((t) => t.key === "promote-flag");
    expect(flag?.enabled).toBe(true);

    const prodRes = await apiGet(`/api/v1/projects/${pid}/toggles?env=production`, { cookie });
    const prod = ((await prodRes.json()) as { key: string; enabled: boolean }[]).find(
      (t) => t.key === "promote-flag",
    );
    expect(prod?.enabled).toBe(false);
  });
});
