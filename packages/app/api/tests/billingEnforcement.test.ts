import { describe, expect, it } from "vitest";
import { isBillingEnforced, canUseTeams } from "../lib/billingEnforcement";

describe("isBillingEnforced", () => {
  it("is disabled when TOGGLES_BILLING_ENABLED=false", () => {
    expect(isBillingEnforced({ TOGGLES_BILLING_ENABLED: "false", DB: {} as D1Database })).toBe(
      false,
    );
  });

  it("is disabled when TOGGLES_SELF_HOST_BUILD=true", () => {
    expect(isBillingEnforced({ TOGGLES_SELF_HOST_BUILD: "true", DB: {} as D1Database })).toBe(
      false,
    );
  });

  it("is disabled for Node self-host (DATABASE_URL without DB binding)", () => {
    expect(isBillingEnforced({ DATABASE_URL: "file:./data.db" })).toBe(false);
  });

  it("stays enabled on Workers when Polar token is missing or placeholder", () => {
    expect(isBillingEnforced({ DB: {} as D1Database })).toBe(true);
    expect(
      isBillingEnforced({
        DB: {} as D1Database,
        POLAR_ACCESS_TOKEN: "your-polar-access-token",
      }),
    ).toBe(true);
  });

  it("is enabled when explicitly true on Workers", () => {
    expect(
      isBillingEnforced({
        TOGGLES_BILLING_ENABLED: "true",
        DB: {} as D1Database,
      }),
    ).toBe(true);
  });
});

describe("canUseTeams", () => {
  it("allows teams without Pro when billing is not enforced", async () => {
    const allowed = await canUseTeams({ TOGGLES_BILLING_ENABLED: "false" }, {} as never, "user-1");
    expect(allowed).toBe(true);
  });
});
