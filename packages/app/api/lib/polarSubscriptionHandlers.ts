import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import type { AgnosticDatabaseInstance } from "../types";

type PolarBillingEnv = Pick<Cloudflare.Env, "POLAR_PRO_PRODUCT_ID">;

type SubscriptionWebhookData = {
  customer_id: string;
  product_id: string;
  status: string;
  current_period_end: string;
};

type SubscriptionActiveWebhookData = {
  customer_id: string;
  id: string;
  current_period_end: string;
  customer: { external_id?: string | null };
};

type CustomerCreatedWebhookData = {
  id: string;
  email?: string | null;
};

function parsePeriodEnd(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

export async function handleSubscriptionUpdated(
  db: AgnosticDatabaseInstance<typeof schema>,
  env: PolarBillingEnv,
  data: SubscriptionWebhookData,
): Promise<void> {
  await db
    .update(schema.subscription)
    .set({
      plan: data.product_id === env.POLAR_PRO_PRODUCT_ID ? "pro" : "free",
      status: data.status,
      currentPeriodEnd: parsePeriodEnd(data.current_period_end),
      updatedAt: new Date(),
    })
    .where(eq(schema.subscription.polarCustomerId, data.customer_id));
}

export async function handleSubscriptionActive(
  db: AgnosticDatabaseInstance<typeof schema>,
  data: SubscriptionActiveWebhookData,
): Promise<void> {
  const customerId = data.customer_id;
  const subscriptionId = data.id;
  const currentPeriodEnd = parsePeriodEnd(data.current_period_end);

  const existing = await db
    .select()
    .from(schema.subscription)
    .where(eq(schema.subscription.polarCustomerId, customerId))
    .get();

  const now = new Date();

  if (existing) {
    await db
      .update(schema.subscription)
      .set({
        plan: "pro",
        status: "active",
        polarSubscriptionId: subscriptionId,
        currentPeriodEnd,
        updatedAt: now,
      })
      .where(eq(schema.subscription.id, existing.id));
    return;
  }

  const externalId = data.customer.external_id;
  if (!externalId) return;

  const user = await db.select().from(schema.user).where(eq(schema.user.id, externalId)).get();

  if (!user) return;

  await db.insert(schema.subscription).values({
    id: crypto.randomUUID(),
    userId: user.id,
    polarCustomerId: customerId,
    polarSubscriptionId: subscriptionId,
    plan: "pro",
    status: "active",
    currentPeriodEnd,
    createdAt: now,
    updatedAt: now,
  });
}

export async function handleSubscriptionCanceled(
  db: AgnosticDatabaseInstance<typeof schema>,
  customerId: string,
): Promise<void> {
  await db
    .update(schema.subscription)
    .set({
      plan: "free",
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(schema.subscription.polarCustomerId, customerId));
}

export async function handleSubscriptionRevoked(
  db: AgnosticDatabaseInstance<typeof schema>,
  customerId: string,
): Promise<void> {
  await db
    .update(schema.subscription)
    .set({
      plan: "free",
      status: "expired",
      updatedAt: new Date(),
    })
    .where(eq(schema.subscription.polarCustomerId, customerId));
}

export async function handleCustomerCreated(
  db: AgnosticDatabaseInstance<typeof schema>,
  data: CustomerCreatedWebhookData,
): Promise<void> {
  const customerId = data.id;
  const email = data.email;
  if (!email) return;

  const user = await db.select().from(schema.user).where(eq(schema.user.email, email)).get();

  if (!user) return;

  const existing = await db
    .select()
    .from(schema.subscription)
    .where(eq(schema.subscription.userId, user.id))
    .get();

  const now = new Date();

  if (existing) {
    await db
      .update(schema.subscription)
      .set({ polarCustomerId: customerId, updatedAt: now })
      .where(eq(schema.subscription.id, existing.id));
    return;
  }

  await db.insert(schema.subscription).values({
    id: crypto.randomUUID(),
    userId: user.id,
    polarCustomerId: customerId,
    plan: "free",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}
