import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { apiGet, apiPost, signUp } from "./helpers";

/**
 * Regression: Better Auth's API key plugin used to default to 10 requests per 24h.
 * Valid keys must keep working for flag reads; plan limits are enforced separately.
 */
describe("API key auth rate limit (Better Auth plugin)", () => {
  let projectId = "";
  let apiKey = "";

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    const cookie = await signUp("ratelimit@example.com", "password1234", "Rate Limit User");

    const proj = await apiPost("/api/v1/projects", {
      cookie,
      body: { name: "Rate Limit Project" },
    });
    expect(proj.status).toBe(201);
    projectId = ((await proj.json()) as { id: string }).id;

    await apiPost(`/api/v1/projects/${projectId}/toggles`, {
      cookie,
      body: { key: "flag-a" },
    });

    const keyRes = await apiPost("/api/v1/api-keys", {
      cookie,
      body: { name: "Read Key", projectId },
    });
    expect(keyRes.status).toBe(201);
    apiKey = ((await keyRes.json()) as { key: string }).key;
  });

  it("allows more than 10 authenticated flag reads with the same API key", async () => {
    const requestCount = 15;

    for (let i = 0; i < requestCount; i++) {
      const res = await apiGet(`/api/v1/projects/${projectId}/toggles`, { bearer: apiKey });
      expect(res.status, `request ${i + 1} should succeed`).toBe(200);
    }
  });
});
