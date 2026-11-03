import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  getUserIdByEmail,
  grantProPlan,
  signUp,
} from "./helpers";

describe("workspaces and teams", () => {
  let ownerCookie = "";
  let orgId = "";
  let teamId = "";
  let sharedProjectId = "";
  let outsiderCookie = "";

  beforeAll(async () => {
    await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

    ownerCookie = await signUp("owner@teams.test", "password1234", "Owner");
    await grantProPlan("owner@teams.test");

    const orgRes = await apiPost("/api/v1/organizations", {
      cookie: ownerCookie,
      body: { name: "Acme", slug: "acme" },
    });
    expect(orgRes.status).toBe(201);
    orgId = ((await orgRes.json()) as { id: string }).id;

    const teamRes = await apiPost(`/api/v1/organizations/${orgId}/teams`, {
      cookie: ownerCookie,
      body: { name: "Platform" },
    });
    expect(teamRes.status).toBe(201);
    teamId = ((await teamRes.json()) as { id: string }).id;

    const projectRes = await apiPost("/api/v1/projects", {
      cookie: ownerCookie,
      body: {
        name: "Shared",
        organizationId: orgId,
        teamId,
      },
    });
    expect(projectRes.status).toBe(201);
    sharedProjectId = ((await projectRes.json()) as { id: string }).id;

    outsiderCookie = await signUp("outsider@teams.test", "password1234", "Outsider");
    await grantProPlan("outsider@teams.test");
  });

  it("rejects workspace creation on the free plan", async () => {
    const cookie = await signUp("free@teams.test", "password1234", "Free");
    const res = await apiPost("/api/v1/organizations", {
      cookie,
      body: { name: "Nope", slug: "nope" },
    });
    expect(res.status).toBe(403);
  });

  it("invites a new user without sending email when email is disabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "newbie@teams.test", role: "member" },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { invitationId: string; inviteUrl: string };
    expect(body.invitationId).toMatch(/^[a-f0-9]{64}$/);
    expect(body.inviteUrl).toContain(body.invitationId);

    const outboundCalls = fetchSpy.mock.calls.filter(([url]) => {
      const href = String(url);
      if (href.includes("smtp")) return true;
      try {
        const { hostname } = new URL(href);
        return hostname === "postmarkapp.com" || hostname.endsWith(".postmarkapp.com");
      } catch {
        return false;
      }
    });
    expect(outboundCalls).toHaveLength(0);
    fetchSpy.mockRestore();
  });

  it("rejects invalid invite emails and duplicate pending invitations", async () => {
    const bad = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "not-an-email", role: "member" },
    });
    expect(bad.status).toBe(400);

    const first = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "dup@teams.test", role: "member" },
    });
    expect(first.status).toBe(201);

    const dup = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "dup@teams.test", role: "member" },
    });
    expect(dup.status).toBe(409);
  });

  it("accepts an invitation and grants team-scoped project access", async () => {
    const inviteRes = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "joiner@teams.test", role: "member" },
    });
    expect(inviteRes.status).toBe(201);
    const { invitationId } = (await inviteRes.json()) as { invitationId: string };

    const joinerCookie = await signUp("joiner@teams.test", "password1234", "Joiner");
    await grantProPlan("joiner@teams.test");

    const acceptRes = await apiPost("/api/auth/organization/accept-invitation", {
      cookie: joinerCookie,
      body: { invitationId },
    });
    expect(acceptRes.status).toBe(200);

    const listRes = await apiGet("/api/v1/projects", { cookie: joinerCookie });
    expect(listRes.status).toBe(200);
    let projects = (await listRes.json()) as { id: string }[];
    expect(projects.some((p) => p.id === sharedProjectId)).toBe(false);

    await apiPost(`/api/v1/organizations/${orgId}/teams/${teamId}/members`, {
      cookie: ownerCookie,
      body: { userId: await getUserIdByEmail("joiner@teams.test") },
    });

    const listAfterTeam = await apiGet("/api/v1/projects", { cookie: joinerCookie });
    projects = (await listAfterTeam.json()) as { id: string }[];
    expect(projects.some((p) => p.id === sharedProjectId)).toBe(true);
  });

  it("denies project toggles to org members outside the team", async () => {
    const inviteRes = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "orgwide@teams.test", role: "member" },
    });
    expect(inviteRes.status).toBe(201);
    const { invitationId } = (await inviteRes.json()) as { invitationId: string };

    const orgMemberCookie = await signUp("orgwide@teams.test", "password1234", "Org Wide");
    await grantProPlan("orgwide@teams.test");

    const acceptRes = await apiPost("/api/auth/organization/accept-invitation", {
      cookie: orgMemberCookie,
      body: { invitationId },
    });
    expect(acceptRes.status).toBe(200);

    const denied = await apiGet(`/api/v1/projects/${sharedProjectId}/toggles`, {
      cookie: orgMemberCookie,
    });
    expect(denied.status).toBe(404);
  });

  it("allows org-wide projects for any workspace member", async () => {
    const orgWideProject = await apiPost("/api/v1/projects", {
      cookie: ownerCookie,
      body: { name: "Org Wide Project", organizationId: orgId },
    });
    expect(orgWideProject.status).toBe(201);
    const orgWideId = ((await orgWideProject.json()) as { id: string }).id;

    const inviteRes = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "member@teams.test", role: "member" },
    });
    expect(inviteRes.status).toBe(201);
    const { invitationId } = (await inviteRes.json()) as { invitationId: string };

    const memberCookie = await signUp("member@teams.test", "password1234", "Member");
    await grantProPlan("member@teams.test");

    const acceptRes = await apiPost("/api/auth/organization/accept-invitation", {
      cookie: memberCookie,
      body: { invitationId },
    });
    expect(acceptRes.status).toBe(200);

    const ok = await apiGet(`/api/v1/projects/${orgWideId}/toggles`, { cookie: memberCookie });
    expect(ok.status).toBe(200);
  });

  it("removes a workspace member", async () => {
    const inviteRes = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "removeme@teams.test", role: "member" },
    });
    expect(inviteRes.status).toBe(201);
    const { invitationId } = (await inviteRes.json()) as { invitationId: string };

    const removeeCookie = await signUp("removeme@teams.test", "password1234", "Remove Me");
    await grantProPlan("removeme@teams.test");
    const acceptRes = await apiPost("/api/auth/organization/accept-invitation", {
      cookie: removeeCookie,
      body: { invitationId },
    });
    expect(acceptRes.status).toBe(200);

    const membersRes = await apiGet(`/api/v1/organizations/${orgId}/members`, {
      cookie: ownerCookie,
    });
    expect(membersRes.status).toBe(200);
    const { members } = (await membersRes.json()) as {
      members: { id: string; email: string }[];
    };
    const target = members.find((m) => m.email === "removeme@teams.test");
    expect(target).toBeDefined();

    const delRes = await apiDelete(`/api/v1/organizations/${orgId}/members/${target!.id}`, {
      cookie: ownerCookie,
    });
    expect(delRes.status).toBe(200);

    const after = await apiGet(`/api/v1/organizations/${orgId}/members`, { cookie: ownerCookie });
    const afterBody = (await after.json()) as { members: { email: string }[] };
    expect(afterBody.members.some((m) => m.email === "removeme@teams.test")).toBe(false);
  });

  it("does not expose shared projects to non-members", async () => {
    const res = await apiGet("/api/v1/projects", { cookie: outsiderCookie });
    expect(res.status).toBe(200);
    const projects = (await res.json()) as { id: string }[];
    expect(projects.some((p) => p.id === sharedProjectId)).toBe(false);
  });

  it("forbids non-members from reading workspace members", async () => {
    const res = await apiGet(`/api/v1/organizations/${orgId}/members`, {
      cookie: outsiderCookie,
    });
    expect(res.status).toBe(403);
  });

  it("forbids workspace members from inviting or managing teams", async () => {
    const inviteRes = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "regular@teams.test", role: "member" },
    });
    expect(inviteRes.status).toBe(201);
    const { invitationId } = (await inviteRes.json()) as { invitationId: string };

    const memberCookie = await signUp("regular@teams.test", "password1234", "Regular");
    await grantProPlan("regular@teams.test");
    const acceptRes = await apiPost("/api/auth/organization/accept-invitation", {
      cookie: memberCookie,
      body: { invitationId },
    });
    expect(acceptRes.status).toBe(200);

    const inviteAttempt = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: memberCookie,
      body: { email: "blocked@teams.test", role: "member" },
    });
    expect(inviteAttempt.status).toBe(403);

    const teamAttempt = await apiPost(`/api/v1/organizations/${orgId}/teams`, {
      cookie: memberCookie,
      body: { name: "Sneaky" },
    });
    expect(teamAttempt.status).toBe(403);
  });

  it("protects the sole workspace owner from removal", async () => {
    const loneCookie = await signUp("loneowner@teams.test", "password1234", "Lone Owner");
    await grantProPlan("loneowner@teams.test");
    const orgRes = await apiPost("/api/v1/organizations", {
      cookie: loneCookie,
      body: { name: "Solo Org", slug: "solo-org" },
    });
    expect(orgRes.status).toBe(201);
    const soloOrgId = ((await orgRes.json()) as { id: string }).id;

    const membersRes = await apiGet(`/api/v1/organizations/${soloOrgId}/members`, {
      cookie: loneCookie,
    });
    const { members } = (await membersRes.json()) as { members: { id: string }[] };
    expect(members).toHaveLength(1);

    const selfRemove = await apiDelete(
      `/api/v1/organizations/${soloOrgId}/members/${members[0]!.id}`,
      {
        cookie: loneCookie,
      },
    );
    expect(selfRemove.status).toBe(400);
  });

  it("rejects team member changes when the team is outside the workspace", async () => {
    const otherOrg = await apiPost("/api/v1/organizations", {
      cookie: outsiderCookie,
      body: { name: "Other", slug: "other-org" },
    });
    expect(otherOrg.status).toBe(201);
    const otherOrgId = ((await otherOrg.json()) as { id: string }).id;

    const otherTeam = await apiPost(`/api/v1/organizations/${otherOrgId}/teams`, {
      cookie: outsiderCookie,
      body: { name: "Other Team" },
    });
    expect(otherTeam.status).toBe(201);
    const otherTeamId = ((await otherTeam.json()) as { id: string }).id;

    const ownerUserId = await getUserIdByEmail("owner@teams.test");
    const badAdd = await apiPost(`/api/v1/organizations/${orgId}/teams/${otherTeamId}/members`, {
      cookie: ownerCookie,
      body: { userId: ownerUserId },
    });
    expect(badAdd.status).toBe(404);
  });

  it("keeps personal projects working without a workspace", async () => {
    const soloCookie = await signUp("solo@teams.test", "password1234", "Solo");
    const projectRes = await apiPost("/api/v1/projects", {
      cookie: soloCookie,
      body: { name: "Personal" },
    });
    expect(projectRes.status).toBe(201);
    const projectId = ((await projectRes.json()) as { id: string }).id;

    const list = await apiGet("/api/v1/projects", { cookie: soloCookie });
    expect(list.status).toBe(200);
    const projects = (await list.json()) as { id: string }[];
    expect(projects.some((p) => p.id === projectId)).toBe(true);

    const toggles = await apiGet(`/api/v1/projects/${projectId}/toggles`, { cookie: soloCookie });
    expect(toggles.status).toBe(200);
  });

  it("updates member roles and blocks demoting the last owner", async () => {
    const inviteRes = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "promote@teams.test", role: "member" },
    });
    expect(inviteRes.status).toBe(201);
    const { invitationId } = (await inviteRes.json()) as { invitationId: string };

    const memberCookie = await signUp("promote@teams.test", "password1234", "Promote Me");
    await grantProPlan("promote@teams.test");
    await apiPost("/api/auth/organization/accept-invitation", {
      cookie: memberCookie,
      body: { invitationId },
    });

    const membersRes = await apiGet(`/api/v1/organizations/${orgId}/members`, {
      cookie: ownerCookie,
    });
    const { members } = (await membersRes.json()) as {
      members: { id: string; email: string; role: string }[];
    };
    const target = members.find((m) => m.email === "promote@teams.test");
    expect(target).toBeDefined();

    const promote = await apiPatch(`/api/v1/organizations/${orgId}/members/${target!.id}`, {
      cookie: ownerCookie,
      body: { role: "admin" },
    });
    expect(promote.status).toBe(200);
    expect(((await promote.json()) as { role: string }).role).toBe("admin");

    const ownerMember = members.find((m) => m.email === "owner@teams.test");
    const demoteOwner = await apiPatch(
      `/api/v1/organizations/${orgId}/members/${ownerMember!.id}`,
      {
        cookie: ownerCookie,
        body: { role: "member" },
      },
    );
    expect(demoteOwner.status).toBe(400);
  });

  it("enforces per-organization invite rate limits", async () => {
    const cookie = await signUp("ratelimit@teams.test", "password1234", "Rate Limit");
    await grantProPlan("ratelimit@teams.test");
    const orgRes = await apiPost("/api/v1/organizations", {
      cookie,
      body: { name: "Rate Org", slug: "rate-org" },
    });
    expect(orgRes.status).toBe(201);
    const rateOrgId = ((await orgRes.json()) as { id: string }).id;

    for (let i = 0; i < 20; i++) {
      const res = await apiPost(`/api/v1/organizations/${rateOrgId}/invite`, {
        cookie,
        body: { email: `rate-${i}@teams.test`, role: "member" },
      });
      expect(res.status).toBe(201);
    }

    const blocked = await apiPost(`/api/v1/organizations/${rateOrgId}/invite`, {
      cookie,
      body: { email: "rate-over@teams.test", role: "member" },
    });
    expect(blocked.status).toBe(429);
  });

  it("grants admins workspace management without owner-only powers", async () => {
    const inviteRes = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "workspace-admin@teams.test", role: "member" },
    });
    expect(inviteRes.status).toBe(201);
    const { invitationId } = (await inviteRes.json()) as { invitationId: string };

    const adminCookie = await signUp("workspace-admin@teams.test", "password1234", "Admin User");
    await grantProPlan("workspace-admin@teams.test");
    await apiPost("/api/auth/organization/accept-invitation", {
      cookie: adminCookie,
      body: { invitationId },
    });

    let membersRes = await apiGet(`/api/v1/organizations/${orgId}/members`, {
      cookie: ownerCookie,
    });
    let { members } = (await membersRes.json()) as {
      members: { id: string; email: string }[];
    };
    const adminMember = members.find((m) => m.email === "workspace-admin@teams.test");
    expect(adminMember).toBeDefined();

    const promote = await apiPatch(`/api/v1/organizations/${orgId}/members/${adminMember!.id}`, {
      cookie: ownerCookie,
      body: { role: "admin" },
    });
    expect(promote.status).toBe(200);

    const adminTeam = await apiPost(`/api/v1/organizations/${orgId}/teams`, {
      cookie: adminCookie,
      body: { name: "Admin Team" },
    });
    expect(adminTeam.status).toBe(201);

    const pendingInvite = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: adminCookie,
      body: { email: "admin-invite@teams.test", role: "member" },
    });
    expect(pendingInvite.status).toBe(201);
    const pendingId = ((await pendingInvite.json()) as { invitationId: string }).invitationId;

    const revoke = await apiDelete(`/api/v1/organizations/${orgId}/invitations/${pendingId}`, {
      cookie: adminCookie,
    });
    expect(revoke.status).toBe(200);

    const ownerInviteBlocked = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: adminCookie,
      body: { email: "no-owner@teams.test", role: "owner" },
    });
    expect(ownerInviteBlocked.status).toBe(403);

    const roleChange = await apiPatch(`/api/v1/organizations/${orgId}/members/${adminMember!.id}`, {
      cookie: adminCookie,
      body: { role: "member" },
    });
    expect(roleChange.status).toBe(403);

    const removeOwner = await apiDelete(
      `/api/v1/organizations/${orgId}/members/${
        members.find((m) => m.email === "owner@teams.test")!.id
      }`,
      { cookie: adminCookie },
    );
    expect(removeOwner.status).toBe(403);

    const memberInvite = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "plain-member@teams.test", role: "member" },
    });
    expect(memberInvite.status).toBe(201);
    const memberInvitationId = (await memberInvite.json()) as { invitationId: string };
    const memberCookie = await signUp("plain-member@teams.test", "password1234", "Plain");
    await grantProPlan("plain-member@teams.test");
    await apiPost("/api/auth/organization/accept-invitation", {
      cookie: memberCookie,
      body: { invitationId: memberInvitationId.invitationId },
    });

    membersRes = await apiGet(`/api/v1/organizations/${orgId}/members`, { cookie: ownerCookie });
    members = (await membersRes.json()).members;
    const plainMember = members.find((m) => m.email === "plain-member@teams.test");
    expect(plainMember).toBeDefined();

    const adminRemoveMember = await apiDelete(
      `/api/v1/organizations/${orgId}/members/${plainMember!.id}`,
      { cookie: adminCookie },
    );
    expect(adminRemoveMember.status).toBe(200);
  }, 30_000);
});
