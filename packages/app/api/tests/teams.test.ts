import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { apiDelete, apiGet, apiPost, getUserIdByEmail, grantProPlan, signUp } from "./helpers";

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

  it("invites a new user without calling Postmark when email is disabled", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await apiPost(`/api/v1/organizations/${orgId}/invite`, {
      cookie: ownerCookie,
      body: { email: "newbie@teams.test", role: "member" },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { invitationId: string; inviteUrl: string };
    expect(body.invitationId).toBeTruthy();
    expect(body.inviteUrl).toContain(body.invitationId);

    const postmarkCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes("postmarkapp.com"),
    );
    expect(postmarkCalls).toHaveLength(0);
    fetchSpy.mockRestore();
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
});
