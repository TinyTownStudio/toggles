import { applyD1Migrations, env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, describe, expect, it } from "vitest";
import * as schema from "../db/schema";
import { getUserPlan, PLAN_LIMITS } from "../lib/plans";
import {
  handleCustomerCreated,
  handleSubscriptionActive,
  handleSubscriptionCanceled,
  handleSubscriptionRevoked,
  handleSubscriptionUpdated,
} from "../lib/polarSubscriptionHandlers";
import { apiGet, apiPost, signUp } from "./helpers";

const TEST_PRO_PRODUCT_ID = "test-polar-pro-product-id";
const polarEnv = { POLAR_PRO_PRODUCT_ID: TEST_PRO_PRODUCT_ID } as Cloudflare.Env;

describe("Polar subscription webhook handlers (SDK v1 payloads)", () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let userId = "";
  const customerId = "polar-customer-test-001";
  const subscriptionId = "polar-subscription-test-001";

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    db = drizzle(env.DB, { schema });
    await signUp("polar-webhook@example.com", "password1234", "Polar User");
    const user = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, "polar-webhook@example.com"))
      .get();
    if (!user) throw new Error("Expected test user");
    userId = user.id;
  });

  it("links a Polar customer to the user on customer.created", async () => {
    await handleCustomerCreated(db, {
      id: customerId,
      email: "polar-webhook@example.com",
    });

    const row = await db
      .select()
      .from(schema.subscription)
      .where(eq(schema.subscription.userId, userId))
      .get();

    expect(row?.polarCustomerId).toBe(customerId);
    expect(row?.plan).toBe("free");
  });

  it("activates pro on subscription.active", async () => {
    await handleSubscriptionActive(db, {
      customer_id: customerId,
      id: subscriptionId,
      current_period_end: "2030-01-01T00:00:00.000Z",
      customer: { external_id: userId },
    });

    expect(await getUserPlan(db, userId)).toBe("pro");
  });

  it("downgrades on subscription.updated when product is not pro", async () => {
    await handleSubscriptionUpdated(db, polarEnv, {
      customer_id: customerId,
      product_id: "other-product-id",
      status: "active",
      current_period_end: "2030-01-01T00:00:00.000Z",
    });

    expect(await getUserPlan(db, userId)).toBe("free");
  });

  it("restores pro when subscription.updated matches pro product id", async () => {
    await handleSubscriptionUpdated(db, polarEnv, {
      customer_id: customerId,
      product_id: TEST_PRO_PRODUCT_ID,
      status: "active",
      current_period_end: "2030-01-01T00:00:00.000Z",
    });

    expect(await getUserPlan(db, userId)).toBe("pro");
  });

  it("downgrades on subscription.canceled", async () => {
    await handleSubscriptionCanceled(db, customerId);
    expect(await getUserPlan(db, userId)).toBe("free");
  });

  it("downgrades on subscription.revoked", async () => {
    await handleSubscriptionUpdated(db, polarEnv, {
      customer_id: customerId,
      product_id: TEST_PRO_PRODUCT_ID,
      status: "active",
      current_period_end: "2030-01-01T00:00:00.000Z",
    });
    expect(await getUserPlan(db, userId)).toBe("pro");

    await handleSubscriptionRevoked(db, customerId);
    expect(await getUserPlan(db, userId)).toBe("free");
  });
});

describe("pro plan enforcement after webhook upgrade", () => {
  let cookie = "";
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const customerId = "polar-customer-plan-enforcement";

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    db = drizzle(env.DB, { schema });
    cookie = await signUp("polar-plan@example.com", "password1234", "Plan User");
    const user = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, "polar-plan@example.com"))
      .get();
    if (!user) throw new Error("Expected test user");

    await handleCustomerCreated(db, {
      id: customerId,
      email: "polar-plan@example.com",
    });
    await handleSubscriptionActive(db, {
      customer_id: customerId,
      id: "polar-sub-plan-enforcement",
      current_period_end: "2030-01-01T00:00:00.000Z",
      customer: { external_id: user.id },
    });
  });

  it("allows more than the free project limit when plan is pro", async () => {
    for (let i = 0; i < PLAN_LIMITS.free.projects + 1; i++) {
      const res = await apiPost("/api/v1/projects", {
        cookie,
        body: { name: `Pro project ${i + 1}` },
      });
      expect(res.status).toBe(201);
    }
  });

  it("reports pro on subscription endpoint", async () => {
    const res = await apiGet("/api/v1/subscription", { cookie });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { plan: string };
    expect(data.plan).toBe("pro");
  });
});
