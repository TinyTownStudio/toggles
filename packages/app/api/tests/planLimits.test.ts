import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { PLAN_LIMITS } from "../lib/plans";
import { apiGet, apiPost, signUp } from "./helpers";

function currentMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

describe("free-plan flag limit", () => {
  let cookie = "";
  let projectAId = "";
  let projectBId = "";
  let blocked: Response;
  let otherProjectOk: Response;

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    cookie = await signUp("flags@example.com", "password1234", "Flag User");

    const projA = await apiPost("/api/v1/projects", { cookie, body: { name: "Flags A" } });
    expect(projA.status).toBe(201);
    projectAId = ((await projA.json()) as { id: string }).id;

    const projB = await apiPost("/api/v1/projects", { cookie, body: { name: "Flags B" } });
    expect(projB.status).toBe(201);
    projectBId = ((await projB.json()) as { id: string }).id;

    const limit = PLAN_LIMITS.free.flags;
    for (let i = 1; i <= limit; i++) {
      const res = await apiPost(`/api/v1/projects/${projectAId}/toggles`, {
        cookie,
        body: { key: `flag-${i}` },
      });
      expect(res.status).toBe(201);
    }

    blocked = await apiPost(`/api/v1/projects/${projectAId}/toggles`, {
      cookie,
      body: { key: "flag-over-limit" },
    });

    otherProjectOk = await apiPost(`/api/v1/projects/${projectBId}/toggles`, {
      cookie,
      body: { key: "other-project-flag" },
    });
  });

  it("blocks the 101st flag in a project with 403", async () => {
    expect(blocked.status).toBe(403);
    const data = (await blocked.json()) as { error: string };
    expect(data.error).toBe("Flag limit reached for your plan");
  });

  it("allows creating flags in a second project under the per-project cap", () => {
    expect(otherProjectOk.status).toBe(201);
  });
});

describe("free-plan API read limit", () => {
  let cookie = "";
  let projectId = "";
  let apiKey = "";
  let userId = "";

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    cookie = await signUp("reads@example.com", "password1234", "Read User");

    const proj = await apiPost("/api/v1/projects", { cookie, body: { name: "Reads" } });
    expect(proj.status).toBe(201);
    projectId = ((await proj.json()) as { id: string }).id;

    const owner = await env.DB.prepare("SELECT user_id FROM project WHERE id = ?")
      .bind(projectId)
      .first<{ user_id: string }>();
    userId = owner!.user_id;

    await apiPost(`/api/v1/projects/${projectId}/toggles`, {
      cookie,
      body: { key: "read-flag" },
    });

    const keyRes = await apiPost("/api/v1/api-keys", {
      cookie,
      body: { name: "Read Key", projectId },
    });
    expect(keyRes.status).toBe(201);
    apiKey = ((await keyRes.json()) as { key: string }).key;

    await env.DB.prepare(
      "INSERT INTO api_usage (user_id, month, reads) VALUES (?, ?, ?) ON CONFLICT(user_id, month) DO UPDATE SET reads = excluded.reads",
    )
      .bind(userId, currentMonth(), PLAN_LIMITS.free.apiReadsPerMonth)
      .run();
  });

  it("returns 429 for API-key GET when monthly read limit is reached", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/toggles`, { bearer: apiKey });
    expect(res.status).toBe(429);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("API read limit reached for your plan");
  });

  it("still allows session GET when monthly read limit is reached", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/toggles`, { cookie });
    expect(res.status).toBe(200);
  });
});
