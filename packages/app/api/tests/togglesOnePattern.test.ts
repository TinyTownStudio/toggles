import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { apiGet, apiPost, signUp } from "./helpers";

describe("GET /api/v1/projects/:projectId/toggles/one pattern matching", () => {
  let cookie = "";
  let projectId = "";

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    cookie = await signUp("pattern@example.com", "password1234", "Pattern User");

    const proj = await apiPost("/api/v1/projects", { cookie, body: { name: "Patterns" } });
    expect(proj.status).toBe(201);
    projectId = ((await proj.json()) as { id: string }).id;

    for (const key of [
      "checkout-beta",
      "checkout-alpha",
      "other-flag",
      "sale_100pct",
      "discount%10",
    ]) {
      const res = await apiPost(`/api/v1/projects/${projectId}/toggles`, {
        cookie,
        body: { key },
      });
      expect(res.status).toBe(201);
    }
  });

  it("matches glob * and returns the first key in ascending order", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/toggles/one?pattern=checkout-*`, {
      cookie,
    });
    expect(res.status).toBe(200);
    const toggle = (await res.json()) as { key: string };
    expect(toggle.key).toBe("checkout-alpha");
  });

  it("matches ? as a single-character wildcard", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/toggles/one?pattern=sale?100pct`, {
      cookie,
    });
    expect(res.status).toBe(200);
    const toggle = (await res.json()) as { key: string };
    expect(toggle.key).toBe("sale_100pct");
  });

  it("treats literal _ and % in glob patterns as themselves", async () => {
    const pct = await apiGet(`/api/v1/projects/${projectId}/toggles/one?pattern=sale_100*`, {
      cookie,
    });
    expect(pct.status).toBe(200);
    expect(((await pct.json()) as { key: string }).key).toBe("sale_100pct");

    const discount = await apiGet(
      `/api/v1/projects/${projectId}/toggles/one?pattern=${encodeURIComponent("discount%10*")}`,
      { cookie },
    );
    expect(discount.status).toBe(200);
    expect(((await discount.json()) as { key: string }).key).toBe("discount%10");
  });

  it("keeps legacy substring matching when the pattern has no glob wildcards", async () => {
    const res = await apiGet(`/api/v1/projects/${projectId}/toggles/one?pattern=checkout alpha`, {
      cookie,
    });
    expect(res.status).toBe(200);
    const toggle = (await res.json()) as { key: string };
    expect(toggle.key).toBe("checkout-alpha");
  });
});
