import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { apiGet, apiPost, signUp } from "./helpers";

describe("teams on self-hosted (billing not enforced)", () => {
  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  });

  it("allows a free user to create a workspace without Pro", async () => {
    const cookie = await signUp("selfhost-free@teams.test", "password1234", "Self Host");
    const res = await apiPost("/api/v1/organizations", {
      cookie,
      body: { name: "Self Host Org", slug: "selfhost-org" },
    });
    expect(res.status).toBe(201);
  });

  it("reports billingEnforced=false on subscription", async () => {
    const cookie = await signUp("selfhost-billing@teams.test", "password1234", "Billing Check");
    const res = await apiGet("/api/v1/subscription", { cookie });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { billingEnforced: boolean };
    expect(body.billingEnforced).toBe(false);
  });
});
