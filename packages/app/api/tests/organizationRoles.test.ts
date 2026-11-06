import { describe, expect, it } from "vitest";
import {
  canAssignInviteRole,
  canManageWorkspace,
  canRemoveWorkspaceMember,
  parseWorkspaceMemberRole,
} from "../lib/organizationRoles";
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

describe("workspace admin permissions", () => {
  it("lets admins manage the workspace but not owners-only actions", () => {
    expect(canManageWorkspace("admin")).toBe(true);
    expect(canManageWorkspace("member")).toBe(false);
    expect(canAssignInviteRole("admin", "member")).toBe(true);
    expect(canAssignInviteRole("admin", "owner")).toBe(false);
    expect(canRemoveWorkspaceMember("admin", "member").allowed).toBe(true);
    expect(canRemoveWorkspaceMember("admin", "admin").allowed).toBe(false);
    expect(canRemoveWorkspaceMember("admin", "owner").allowed).toBe(false);
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
