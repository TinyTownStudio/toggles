import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { PLAN_LIMITS } from "../lib/plans";
import { currentMonth } from "../lib/usage";
import { apiGet, apiPost, signUp } from "./helpers";

describe("consumeApiRead concurrent first reads", () => {
  let projectId = "";
  let apiKey = "";
  let userId = "";

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    const cookie = await signUp("usage-race@example.com", "password1234", "Usage Race");

    const proj = await apiPost("/api/v1/projects", { cookie, body: { name: "Usage Race" } });
    expect(proj.status).toBe(201);
    projectId = ((await proj.json()) as { id: string }).id;

    const owner = await env.DB.prepare("SELECT user_id FROM project WHERE id = ?")
      .bind(projectId)
      .first<{ user_id: string }>();
    userId = owner!.user_id;

    await apiPost(`/api/v1/projects/${projectId}/toggles`, {
      cookie,
      body: { key: "race-flag" },
    });

    const keyRes = await apiPost("/api/v1/api-keys", {
      cookie,
      body: { name: "Race Key", projectId },
    });
    expect(keyRes.status).toBe(201);
    apiKey = ((await keyRes.json()) as { key: string }).key;

    await env.DB.prepare("DELETE FROM api_usage WHERE user_id = ?").bind(userId).run();
  });

  it("counts every concurrent first read of the month without unique constraint errors", async () => {
    const parallelReads = 25;
    const limit = PLAN_LIMITS.free.apiReadsPerMonth;
    expect(parallelReads).toBeLessThan(limit);

    const path = `/api/v1/projects/${projectId}/toggles/one?flag=race-flag`;
    const results = await Promise.all(
      Array.from({ length: parallelReads }, () => apiGet(path, { bearer: apiKey })),
    );

    for (const res of results) {
      expect(res.status).toBe(200);
    }

    const row = await env.DB.prepare("SELECT reads FROM api_usage WHERE user_id = ? AND month = ?")
      .bind(userId, currentMonth())
      .first<{ reads: number }>();

    expect(row?.reads).toBe(parallelReads);
  });
});
