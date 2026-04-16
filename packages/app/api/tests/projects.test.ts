import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { apiDelete, apiGet, apiPost, signUp } from "./helpers";

let cookie = "";
let otherCookie = "";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

  cookie = await signUp("projects@example.com", "password1234", "Projects User");
  otherCookie = await signUp("other@example.com", "password1234", "Other User");
});

// ---------------------------------------------------------------------------
// Basic CRUD
// ---------------------------------------------------------------------------

describe("GET /api/v1/projects", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await apiGet("/api/v1/projects");
    expect(res.status).toBe(401);
  });

  it("returns an empty list for a new user", async () => {
    const res = await apiGet("/api/v1/projects", { cookie });
    expect(res.status).toBe(200);
    const data = (await res.json()) as unknown[];
    expect(data).toEqual([]);
  });
});

describe("POST /api/v1/projects", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await apiPost("/api/v1/projects", { body: { name: "X" } });
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    const res = await apiPost("/api/v1/projects", { cookie, body: {} });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("name is required");
  });

  it("returns 400 when name is blank", async () => {
    const res = await apiPost("/api/v1/projects", { cookie, body: { name: "   " } });
    expect(res.status).toBe(400);
  });

  it("creates a project and returns 201", async () => {
    const res = await apiPost("/api/v1/projects", { cookie, body: { name: "My Project" } });
    expect(res.status).toBe(201);
    const data = (await res.json()) as { id: string; name: string };
    expect(data.id).toBeTruthy();
    expect(data.name).toBe("My Project");
  });
});

describe("DELETE /api/v1/projects/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const createRes = await apiPost("/api/v1/projects", { cookie, body: { name: "To Delete" } });
    const { id } = (await createRes.json()) as { id: string };
    const res = await apiDelete(`/api/v1/projects/${id}`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await apiDelete("/api/v1/projects/does-not-exist", { cookie });
    expect(res.status).toBe(404);
  });

  it("returns 404 when another user tries to delete the project", async () => {
    const createRes = await apiPost("/api/v1/projects", { cookie, body: { name: "Owner Only" } });
    const { id } = (await createRes.json()) as { id: string };
    const res = await apiDelete(`/api/v1/projects/${id}`, { cookie: otherCookie });
    expect(res.status).toBe(404);
  });

  it("deletes a project and returns 204", async () => {
    const createRes = await apiPost("/api/v1/projects", { cookie, body: { name: "Delete Me" } });
    const { id } = (await createRes.json()) as { id: string };
    const res = await apiDelete(`/api/v1/projects/${id}`, { cookie });
    expect(res.status).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// User isolation
// ---------------------------------------------------------------------------

describe("user isolation", () => {
  it("users cannot see each other's projects", async () => {
    await apiPost("/api/v1/projects", { cookie, body: { name: "User A Project" } });
    await apiPost("/api/v1/projects", { cookie: otherCookie, body: { name: "User B Project" } });

    const resA = await apiGet("/api/v1/projects", { cookie });
    const resB = await apiGet("/api/v1/projects", { cookie: otherCookie });

    const projectsA = (await resA.json()) as { name: string }[];
    const projectsB = (await resB.json()) as { name: string }[];

    expect(projectsA.every((p) => p.name !== "User B Project")).toBe(true);
    expect(projectsB.every((p) => p.name !== "User A Project")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Plan limit enforcement
// ---------------------------------------------------------------------------

describe("free-plan project limit", () => {
  let limitCookie = "";
  let limitProjectIds: string[] = [];
  let eleventh: Response;
  let postDeleteRes: Response;

  beforeAll(async () => {
    limitCookie = await signUp("limit@example.com", "password1234", "Limit User");

    // Create exactly 10 projects (the free-plan cap)
    for (let i = 1; i <= 10; i++) {
      const res = await apiPost("/api/v1/projects", {
        cookie: limitCookie,
        body: { name: `Project ${i}` },
      });
      expect(res.status).toBe(201);
      limitProjectIds.push(((await res.json()) as { id: string }).id);
    }

    // Attempt to create the 11th — should be blocked
    eleventh = await apiPost("/api/v1/projects", {
      cookie: limitCookie,
      body: { name: "Project 11" },
    });

    // Delete one project and try again — should succeed
    await apiDelete(`/api/v1/projects/${limitProjectIds[0]}`, { cookie: limitCookie });
    postDeleteRes = await apiPost("/api/v1/projects", {
      cookie: limitCookie,
      body: { name: "Replacement Project" },
    });
  });

  it("allows creating up to 10 projects", () => {
    expect(limitProjectIds.length).toBe(10);
  });

  it("blocks the 11th project with 403", async () => {
    expect(eleventh.status).toBe(403);
    const data = (await eleventh.json()) as { error: string };
    expect(data.error).toBe("Project limit reached for your plan");
  });

  it("allows creating again after deleting one project", () => {
    expect(postDeleteRes.status).toBe(201);
  });
});
