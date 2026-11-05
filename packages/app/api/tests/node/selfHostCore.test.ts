import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../index";
import { apiGet, apiPatch, apiPost, nodeBindings, signUp } from "./helpers";
import { installNodeTestEnv, teardownNodeTestEnv } from "./nodeTestEnv";

describe("Node + SQLite self-host API", () => {
  let cookie = "";
  let projectId = "";
  let apiKey = "";

  beforeAll(async () => {
    installNodeTestEnv();

    const ping = await app.request("http://localhost/ping", {}, nodeBindings);
    expect(ping.status).toBe(200);

    cookie = await signUp("node-selfhost@example.com", "password1234", "Node User");

    const projRes = await apiPost("/api/v1/projects", { cookie, body: { name: "Node Project" } });
    expect(projRes.status).toBe(201);
    projectId = ((await projRes.json()) as { id: string }).id;

    const envRes = await apiPost(`/api/v1/projects/${projectId}/environments`, {
      cookie,
      body: { name: "Staging" },
    });
    expect(envRes.status).toBe(201);
    expect(((await envRes.json()) as { slug: string }).slug).toBe("staging");

    for (const key of ["checkout-beta", "checkout-alpha", "feature-x"]) {
      const toggleRes = await apiPost(`/api/v1/projects/${projectId}/toggles`, {
        cookie,
        body: { key, enabled: false },
      });
      expect(toggleRes.status).toBe(201);
    }

    const keyRes = await apiPost("/api/v1/api-keys", {
      cookie,
      body: { name: "Node test key", projectId },
    });
    expect(keyRes.status).toBe(201);
    apiKey = ((await keyRes.json()) as { key: string }).key;
  });

  afterAll(() => {
    teardownNodeTestEnv();
  });

  it("reads toggles with session auth", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/toggles`, { cookie });
    expect(res.status).toBe(200);
    const toggles = (await res.json()) as { key: string; enabled: boolean }[];
    expect(toggles.some((t) => t.key === "feature-x" && !t.enabled)).toBe(true);
  });

  it("reads toggles with API key auth", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/toggles`, { bearer: apiKey });
    expect(res.status).toBe(200);
    const toggles = (await res.json()) as { key: string }[];
    expect(toggles.map((t) => t.key)).toContain("checkout-alpha");
  });

  it("resolves /toggles/one by flag query", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/toggles/one?flag=feature-x`, {
      cookie,
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { key: string }).key).toBe("feature-x");
  });

  it("matches glob patterns on /toggles/one", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/toggles/one?pattern=checkout-*`, {
      cookie,
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { key: string }).key).toBe("checkout-alpha");
  });

  it("scopes toggle values per environment on Node SQLite", async () => {
    const listRes = await apiGet(`/api/v1/projects/${projectId}/toggles?env=production`, {
      cookie,
    });
    expect(listRes.status).toBe(200);
    const prodToggle = ((await listRes.json()) as { key: string; id: string }[]).find(
      (t) => t.key === "feature-x",
    );
    expect(prodToggle).toBeDefined();

    const patchRes = await apiPatch(
      `/api/v1/projects/${projectId}/toggles/${prodToggle!.id}?env=staging`,
      { cookie, body: { enabled: true } },
    );
    expect(patchRes.status).toBe(200);

    const stagingRes = await apiGet(`/api/v1/projects/${projectId}/toggles?env=staging`, {
      cookie,
    });
    const prodRes = await apiGet(`/api/v1/projects/${projectId}/toggles?env=production`, {
      cookie,
    });
    const stagingEnabled = ((await stagingRes.json()) as { key: string; enabled: boolean }[]).find(
      (t) => t.key === "feature-x",
    )?.enabled;
    const prodEnabled = ((await prodRes.json()) as { key: string; enabled: boolean }[]).find(
      (t) => t.key === "feature-x",
    )?.enabled;
    expect(stagingEnabled).toBe(true);
    expect(prodEnabled).toBe(false);
  });
});
