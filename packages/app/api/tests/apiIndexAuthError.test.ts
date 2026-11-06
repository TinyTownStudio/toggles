import { SELF } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/auth", () => ({
  createAuth: () => {
    throw new Error("auth init failed");
  },
}));

describe("BetterAuth handler error path", () => {
  it("returns 500 when createAuth throws", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/get-session", {
      headers: { Accept: "application/json" },
    });
    expect(res.status).toBe(500);
    expect(((await res.json()) as { error: string }).error).toBe("Internal Server Error");
  });
});
