import { describe, expect, it } from "vitest";
import { parseWorkspaceMemberRole } from "../lib/organizationRoles";
import { resolveInviteRateLimitPerHour } from "../lib/inviteRateLimit";

describe("parseWorkspaceMemberRole", () => {
  it("accepts owner, admin, and member", () => {
    expect(parseWorkspaceMemberRole("owner")).toBe("owner");
    expect(parseWorkspaceMemberRole("admin")).toBe("admin");
    expect(parseWorkspaceMemberRole("member")).toBe("member");
  });

  it("rejects unknown roles", () => {
    expect(parseWorkspaceMemberRole("superuser")).toBeNull();
  });
});

describe("resolveInviteRateLimitPerHour", () => {
  it("defaults to 20 invites per hour", () => {
    expect(resolveInviteRateLimitPerHour({})).toBe(20);
  });

  it("honors zero to disable limiting", () => {
    expect(resolveInviteRateLimitPerHour({ TOGGLES_ORG_INVITES_PER_HOUR: "0" })).toBe(0);
  });
});
