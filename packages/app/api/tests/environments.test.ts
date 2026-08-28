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

describe("environment toggle resolution", () => {
  let toggleId = "";

  beforeAll(async () => {
    const toggleRes = await apiPost(`/api/v1/projects/${projectId}/toggles`, {
      cookie,
      body: { key: "env-flag", enabled: false },
    });
    toggleId = ((await toggleRes.json()) as { id: string }).id;
  });

  it("staging inherits default value when no override exists", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/toggles?env=staging`, { cookie });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { key: string; enabled: boolean; inherited: boolean }[];
    const flag = data.find((t) => t.key === "env-flag");
    expect(flag?.enabled).toBe(false);
    expect(flag?.inherited).toBe(true);
  });

  it("override on staging env works", async () => {
    const patchRes = await apiPatch(
      `/api/v1/projects/${projectId}/toggles/${toggleId}?env=staging`,
      {
        cookie,
        body: { enabled: true },
      },
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as { enabled: boolean; inherited: boolean };
    expect(patched.enabled).toBe(true);
    expect(patched.inherited).toBe(false);

    const listRes = await apiGet(`/api/v1/projects/${projectId}/toggles?env=production`, {
      cookie,
    });
    const list = (await listRes.json()) as { key: string; enabled: boolean }[];
    const prod = list.find((t) => t.key === "env-flag");
    expect(prod?.enabled).toBe(false);
  });

  it("reverting override deletes toggle_state row", async () => {
    const patchRes = await apiPatch(
      `/api/v1/projects/${projectId}/toggles/${toggleId}?env=staging`,
      {
        cookie,
        body: { enabled: false },
      },
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as { enabled: boolean; inherited: boolean };
    expect(patched.enabled).toBe(false);
    expect(patched.inherited).toBe(true);
  });

  it("GET /toggles/one resolves env with flag query", async () => {
    await apiPatch(`/api/v1/projects/${projectId}/toggles/${toggleId}?env=staging`, {
      cookie,
      body: { enabled: true },
    });

    const res = await apiGet(
      `/api/v1/projects/${projectId}/toggles/one?flag=env-flag&env=staging`,
      { cookie },
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { enabled: boolean; environment: string };
    expect(data.enabled).toBe(true);
    expect(data.environment).toBe("staging");
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
  });
});
