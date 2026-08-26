import { Hono } from "hono";
import { eq, and, inArray } from "drizzle-orm";
import * as schema from "../db/schema";
import { getUserPlan, PLAN_LIMITS } from "../lib/plans";
import { sendInvitationEmail } from "../lib/email";
import { env } from "hono/adapter";
import type { Bindings, Variables, AgnosticDatabaseInstance } from "../types";

export const organizations = new Hono<{
  Bindings: Bindings;
  Variables: Variables<typeof schema>;
}>();

// ── Helpers ────────────────────────────────────────────────────

async function getOrgMembership(
  db: AgnosticDatabaseInstance<typeof schema>,
  userId: string,
  orgId: string,
) {
  return db
    .select()
    .from(schema.member)
    .where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, orgId)))
    .get();
}

// ── GET / — list workspaces the user is a member of ───────────

organizations.get("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const db = c.get("db");

  const rows = await db
    .select()
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .where(eq(schema.member.userId, userId))
    .all();

  return c.json(rows.map((r) => ({ ...r.organization, role: r.member.role })));
});

// ── POST / — create a workspace (pro plan required) ───────────

organizations.post("/", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const db = c.get("db");
  const plan = await getUserPlan(db, userId);
  if (!PLAN_LIMITS[plan].teams) {
    return c.json({ error: "Workspaces require a Pro plan" }, 403);
  }

  const body = await c.req.json<{ name?: string; slug?: string }>();
  if (!body.name?.trim()) return c.json({ error: "name is required" }, 400);
  if (!body.slug?.trim()) return c.json({ error: "slug is required" }, 400);

  const slug = body.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  const existing = await db
    .select()
    .from(schema.organization)
    .where(eq(schema.organization.slug, slug))
    .get();

  if (existing) return c.json({ error: "Slug is already taken" }, 409);

  const now = new Date();
  const orgId = crypto.randomUUID();

  await db.insert(schema.organization).values({
    id: orgId,
    name: body.name.trim(),
    slug,
    createdAt: now,
  });

  await db.insert(schema.member).values({
    id: crypto.randomUUID(),
    userId,
    organizationId: orgId,
    role: "owner",
    createdAt: now,
  });

  const org = await db
    .select()
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .get();

  return c.json({ ...org, role: "owner" }, 201);
});

// ── GET /:orgId/members — list members + pending invitations ──

organizations.get("/:orgId/members", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const orgId = c.req.param("orgId");
  const db = c.get("db");

  const membership = await getOrgMembership(db, userId, orgId);
  if (!membership) return c.json({ error: "Forbidden" }, 403);

  const memberRows = await db
    .select()
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(eq(schema.member.organizationId, orgId))
    .all();

  const members = memberRows.map((r) => ({
    id: r.member.id,
    userId: r.user.id,
    name: r.user.name,
    email: r.user.email,
    role: r.member.role,
    joinedAt: r.member.createdAt,
  }));

  const invitations = await db
    .select()
    .from(schema.invitation)
    .where(
      and(eq(schema.invitation.organizationId, orgId), eq(schema.invitation.status, "pending")),
    )
    .all();

  return c.json({ members, invitations });
});

// ── POST /:orgId/invite — invite a user by email ──────────────

organizations.post("/:orgId/invite", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const orgId = c.req.param("orgId");
  const db = c.get("db");

  const membership = await getOrgMembership(db, userId, orgId);
  if (!membership || membership.role !== "owner") return c.json({ error: "Forbidden" }, 403);

  const plan = await getUserPlan(db, userId);
  if (!PLAN_LIMITS[plan].teams) {
    return c.json({ error: "Workspaces require a Pro plan" }, 403);
  }

  const body = await c.req.json<{ email?: string; role?: string }>();
  if (!body.email?.trim()) return c.json({ error: "email is required" }, 400);

  const email = body.email.trim().toLowerCase();
  const role = body.role === "owner" ? "owner" : "member";

  const org = await db
    .select()
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .get();
  if (!org) return c.json({ error: "Workspace not found" }, 404);

  // Check if user already exists on the platform
  const existingUser = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .get();

  if (existingUser) {
    const alreadyMember = await db
      .select()
      .from(schema.member)
      .where(
        and(eq(schema.member.userId, existingUser.id), eq(schema.member.organizationId, orgId)),
      )
      .get();

    if (alreadyMember) return c.json({ error: "User is already a member" }, 409);

    await db.insert(schema.member).values({
      id: crypto.randomUUID(),
      userId: existingUser.id,
      organizationId: orgId,
      role,
      createdAt: new Date(),
    });

    return c.json({ added: true, existing: true });
  }

  // User does not exist — create invitation record and send email
  const inviterUser = await db.select().from(schema.user).where(eq(schema.user.id, userId)).get();
  if (!inviterUser) return c.json({ error: "Inviter not found" }, 500);

  const now = new Date();
  const invitationId = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  await db.insert(schema.invitation).values({
    id: invitationId,
    email,
    inviterId: userId,
    organizationId: orgId,
    role,
    status: "pending",
    expiresAt,
    createdAt: now,
  });

  const { BETTER_AUTH_URL, POSTMARK_SERVER_TOKEN } = env(c);
  const baseUrl = BETTER_AUTH_URL.replace("/api/auth", "");
  const inviteUrl = `${baseUrl}/invite/accept?token=${invitationId}`;

  try {
    await sendInvitationEmail({
      to: email,
      inviterName: inviterUser.name,
      workspaceName: org.name,
      inviteUrl,
      serverToken: POSTMARK_SERVER_TOKEN,
    });
  } catch (err) {
    console.error("Failed to send invitation email:", err);
    // Invitation record was created; don't fail the request over email delivery
  }

  return c.json({ added: false, existing: false, invitationId }, 201);
});

// ── DELETE /:orgId/members/:memberId ─────────────────────────

organizations.delete("/:orgId/members/:memberId", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const { orgId, memberId } = c.req.param();
  const db = c.get("db");

  const callerMembership = await getOrgMembership(db, userId, orgId);
  if (!callerMembership || callerMembership.role !== "owner") {
    return c.json({ error: "Forbidden" }, 403);
  }

  const target = await db
    .select()
    .from(schema.member)
    .where(and(eq(schema.member.id, memberId), eq(schema.member.organizationId, orgId)))
    .get();

  if (!target) return c.json({ error: "Member not found" }, 404);
  if (target.userId === userId) return c.json({ error: "Cannot remove yourself" }, 400);

  await db.delete(schema.member).where(eq(schema.member.id, memberId));

  return c.json({ success: true });
});

// ── GET /:orgId/teams ─────────────────────────────────────────

organizations.get("/:orgId/teams", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const orgId = c.req.param("orgId");
  const db = c.get("db");

  const membership = await getOrgMembership(db, userId, orgId);
  if (!membership) return c.json({ error: "Forbidden" }, 403);

  const teams = await db
    .select()
    .from(schema.team)
    .where(eq(schema.team.organizationId, orgId))
    .all();

  const teamIds = teams.map((t) => t.id);
  const teamMemberRows =
    teamIds.length > 0
      ? await db
          .select()
          .from(schema.teamMember)
          .innerJoin(schema.user, eq(schema.teamMember.userId, schema.user.id))
          .where(inArray(schema.teamMember.teamId, teamIds))
          .all()
      : [];

  const result = teams.map((team) => ({
    ...team,
    members: teamMemberRows
      .filter((tm) => tm.teamMember.teamId === team.id)
      .map((tm) => ({ userId: tm.user.id, name: tm.user.name, email: tm.user.email })),
  }));

  return c.json(result);
});

// ── POST /:orgId/teams ────────────────────────────────────────

organizations.post("/:orgId/teams", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const orgId = c.req.param("orgId");
  const db = c.get("db");

  const membership = await getOrgMembership(db, userId, orgId);
  if (!membership || membership.role !== "owner") return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json<{ name?: string }>();
  if (!body.name?.trim()) return c.json({ error: "name is required" }, 400);

  const now = new Date();
  const teamId = crypto.randomUUID();

  await db.insert(schema.team).values({
    id: teamId,
    name: body.name.trim(),
    organizationId: orgId,
    createdAt: now,
    updatedAt: now,
  });

  const team = await db.select().from(schema.team).where(eq(schema.team.id, teamId)).get();
  return c.json(team, 201);
});

// ── POST /:orgId/teams/:teamId/members ────────────────────────

organizations.post("/:orgId/teams/:teamId/members", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const { orgId, teamId } = c.req.param();
  const db = c.get("db");

  const membership = await getOrgMembership(db, userId, orgId);
  if (!membership || membership.role !== "owner") return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json<{ userId?: string }>();
  if (!body.userId) return c.json({ error: "userId is required" }, 400);

  const targetMembership = await getOrgMembership(db, body.userId, orgId);
  if (!targetMembership) return c.json({ error: "User is not a workspace member" }, 400);

  const team = await db
    .select()
    .from(schema.team)
    .where(and(eq(schema.team.id, teamId), eq(schema.team.organizationId, orgId)))
    .get();
  if (!team) return c.json({ error: "Team not found" }, 404);

  const existing = await db
    .select()
    .from(schema.teamMember)
    .where(and(eq(schema.teamMember.teamId, teamId), eq(schema.teamMember.userId, body.userId)))
    .get();
  if (existing) return c.json({ error: "Already a team member" }, 409);

  await db.insert(schema.teamMember).values({
    id: crypto.randomUUID(),
    teamId,
    userId: body.userId,
    createdAt: new Date(),
  });

  return c.json({ success: true }, 201);
});

// ── DELETE /:orgId/teams/:teamId/members/:targetUserId ────────

organizations.delete("/:orgId/teams/:teamId/members/:targetUserId", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const { orgId, teamId, targetUserId } = c.req.param();
  const db = c.get("db");

  const membership = await getOrgMembership(db, userId, orgId);
  if (!membership || membership.role !== "owner") return c.json({ error: "Forbidden" }, 403);

  await db
    .delete(schema.teamMember)
    .where(and(eq(schema.teamMember.teamId, teamId), eq(schema.teamMember.userId, targetUserId)));

  return c.json({ success: true });
});
