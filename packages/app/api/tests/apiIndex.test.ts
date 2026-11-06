import { applyD1Migrations, env, SELF } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { LOCAL_DEV_ORIGIN } from "../lib/appOrigin";
import { apiGet, signUp } from "./helpers";
import { getCheckouts } from "@polar-sh/sdk/2026-10/services/checkouts";
import { iterListSubscriptions } from "@polar-sh/sdk/2026-10/services/subscriptions";

function setTestPolarCheckout(value: Record<string, unknown> | null): void {
  env.TEST_POLAR_CHECKOUT_JSON = value ? JSON.stringify(value) : "";
}

function setTestPolarSubscriptions(items: Record<string, unknown>[]): void {
  env.TEST_POLAR_SUBSCRIPTIONS_JSON = JSON.stringify(items);
}

function resetPolarTestFixtures(): void {
  env.TEST_POLAR_CHECKOUT_JSON = "";
  env.TEST_POLAR_SUBSCRIPTIONS_JSON = "";
}

describe("api index routes and middleware", () => {
  let cookie = "";
  let userId = "";

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    cookie = await signUp("index-route@example.com", "password1234", "Index Route User");
    const db = drizzle(env.DB, { schema });
    const user = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, "index-route@example.com"))
      .get();
    if (!user) throw new Error("Expected test user");
    userId = user.id;
  });

  beforeEach(() => {
    resetPolarTestFixtures();
  });

  it("polar SDK test doubles read binding-backed fixtures", async () => {
    setTestPolarCheckout({ id: "chk_fixture", customer_id: "cust", external_customer_id: "user" });
    setTestPolarSubscriptions([{ id: "sub_fixture" }]);

    const checkout = await getCheckouts(null)("chk_fixture");
    expect(checkout?.id).toBe("chk_fixture");

    const subs: Record<string, unknown>[] = [];
    for await (const sub of iterListSubscriptions(null)({})) {
      subs.push(sub);
    }
    expect(subs).toEqual([{ id: "sub_fixture" }]);
  });

  it("GET /ping returns ok without touching /api middleware", async () => {
    const res = await SELF.fetch("http://localhost/ping");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("sets security headers on /api/* responses", async () => {
    const res = await apiGet("/api/v1/projects", { cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=63072000");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
  });

  describe("GET /api/billing-success", () => {
    it("returns 401 without a session", async () => {
      const res = await apiGet("/api/billing-success?checkout_id=chk_test");
      expect(res.status).toBe(401);
      expect(((await res.json()) as { error: string }).error).toBe("Unauthorized");
    });

    it("returns 400 when checkout_id is missing", async () => {
      const res = await apiGet("/api/billing-success", { cookie });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe("Missing checkout_id parameter");
    });

    it("returns 400 for an invalid checkout session", async () => {
      setTestPolarCheckout({ id: "chk_bad" });
      const res = await apiGet("/api/billing-success?checkout_id=chk_bad", { cookie });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe("Invalid checkout session");
    });

    it("returns 400 when checkout has no associated user", async () => {
      setTestPolarCheckout({
        id: "chk_no_user",
        customer_id: "cust_1",
      });
      const res = await apiGet("/api/billing-success?checkout_id=chk_no_user", { cookie });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe(
        "Checkout has no associated user",
      );
    });

    it("returns 403 when checkout belongs to another user", async () => {
      setTestPolarCheckout({
        id: "chk_other",
        customer_id: "cust_1",
        external_customer_id: "someone-else",
      });
      const res = await apiGet("/api/billing-success?checkout_id=chk_other", { cookie });
      expect(res.status).toBe(403);
      expect(((await res.json()) as { error: string }).error).toBe("Forbidden");
    });

    it("returns 404 when Polar has no active subscription", async () => {
      setTestPolarCheckout({
        id: "chk_empty_subs",
        customer_id: "cust_1",
        external_customer_id: userId,
      });
      setTestPolarSubscriptions([]);
      const res = await apiGet("/api/billing-success?checkout_id=chk_empty_subs", { cookie });
      expect(res.status).toBe(404);
      expect(((await res.json()) as { error: string }).error).toBe("No active subscription found");
    });

    it("upserts pro subscription and redirects on success", async () => {
      setTestPolarCheckout({
        id: "chk_ok",
        customer_id: "cust_billing",
        external_customer_id: userId,
      });
      setTestPolarSubscriptions([
        {
          id: "sub_active",
          current_period_end: "2030-06-01T00:00:00.000Z",
        },
      ]);

      const res = await apiGet("/api/billing-success?checkout_id=chk_ok", {
        cookie,
        redirect: "manual",
      });
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe(`${LOCAL_DEV_ORIGIN}/app/billing?success=true`);

      const db = drizzle(env.DB, { schema });
      const row = await db
        .select()
        .from(schema.subscription)
        .where(eq(schema.subscription.userId, userId))
        .get();
      expect(row?.plan).toBe("pro");
      expect(row?.status).toBe("active");
      expect(row?.polarCustomerId).toBe("cust_billing");
      expect(row?.polarSubscriptionId).toBe("sub_active");
      expect(row?.currentPeriodEnd?.toISOString()).toBe("2030-06-01T00:00:00.000Z");
    });

    it("is idempotent when the success URL is replayed", async () => {
      setTestPolarCheckout({
        id: "chk_ok",
        customer_id: "cust_billing",
        external_customer_id: userId,
      });
      setTestPolarSubscriptions([{ id: "sub_active" }]);

      const first = await apiGet("/api/billing-success?checkout_id=chk_ok", {
        cookie,
        redirect: "manual",
      });
      const second = await apiGet("/api/billing-success?checkout_id=chk_ok", {
        cookie,
        redirect: "manual",
      });
      expect(first.status).toBe(302);
      expect(second.status).toBe(302);

      const db = drizzle(env.DB, { schema });
      const rows = await db
        .select({ id: schema.subscription.id })
        .from(schema.subscription)
        .where(eq(schema.subscription.userId, userId))
        .all();
      expect(rows).toHaveLength(1);
    });

    it("stores null currentPeriodEnd when Polar omits the field", async () => {
      setTestPolarCheckout({
        id: "chk_no_period",
        customer_id: "cust_np",
        external_customer_id: userId,
      });
      setTestPolarSubscriptions([{ id: "sub_no_period" }]);

      const res = await apiGet("/api/billing-success?checkout_id=chk_no_period", {
        cookie,
        redirect: "manual",
      });
      expect(res.status).toBe(302);

      const db = drizzle(env.DB, { schema });
      const row = await db
        .select({ currentPeriodEnd: schema.subscription.currentPeriodEnd })
        .from(schema.subscription)
        .where(eq(schema.subscription.userId, userId))
        .get();
      expect(row?.currentPeriodEnd).toBeNull();
    });
  });
});
