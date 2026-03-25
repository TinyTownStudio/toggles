import { assertEquals } from "@std/assert";
import { app } from "../app.ts";

Deno.test("GET /health returns 200 with ok status", async () => {
  const res = await app.request("/health");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.status, "ok");
  assertEquals(typeof body.timestamp, "string");
});

Deno.test("GET /health timestamp is a valid ISO string", async () => {
  const res = await app.request("/health");
  const body = await res.json();
  const parsed = new Date(body.timestamp);
  assertEquals(Number.isNaN(parsed.getTime()), false);
});
