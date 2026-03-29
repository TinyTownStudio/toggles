// Environment bindings
export interface Env {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  POLAR_ACCESS_TOKEN: string;
  POLAR_WEBHOOK_SECRET: string;
  POLAR_PRO_PRODUCT_ID: string;
  LOCAL?: string;
}

// User context type (used for Fastify decorators)
export type UserContext = {
  id: string;
  name: string;
  email: string;
} | null;

// Session context type (used for Fastify decorators)
export type SessionContext = {
  id: string;
  userId: string;
  expiresAt: Date;
} | null;
