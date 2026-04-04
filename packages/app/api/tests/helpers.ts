import { SELF } from "cloudflare:test";

const BASE = "http://localhost";

export async function signUp(email: string, password: string, name = "Test User"): Promise<string> {
  const res = await SELF.fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`signUp failed ${res.status}: ${text}`);
  }
  return extractCookie(res);
}

export async function signIn(email: string, password: string): Promise<string> {
  const res = await SELF.fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`signIn failed ${res.status}: ${text}`);
  }
  return extractCookie(res);
}

function extractCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? "";
  // Grab just the first name=value pair (drop Max-Age, Path, etc.)
  const match = setCookie.match(/^([^;]+)/);
  if (!match) throw new Error(`No cookie in response: ${setCookie}`);
  return match[1];
}

// ---------------------------------------------------------------------------
// Fetch wrappers
// ---------------------------------------------------------------------------

type RequestInit = { cookie?: string; bearer?: string; body?: unknown };

function buildHeaders(opts: RequestInit, extra: Record<string, string> = {}): Headers {
  const h = new Headers(extra);
  if (opts.cookie) h.set("Cookie", opts.cookie);
  if (opts.bearer) h.set("Authorization", `Bearer ${opts.bearer}`);
  return h;
}

export async function apiGet(path: string, opts: RequestInit = {}): Promise<Response> {
  return SELF.fetch(`${BASE}${path}`, {
    headers: buildHeaders(opts),
  });
}

export async function apiPost(path: string, opts: RequestInit = {}): Promise<Response> {
  const headers = buildHeaders(opts, { "Content-Type": "application/json" });
  return SELF.fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

export async function apiPatch(path: string, opts: RequestInit = {}): Promise<Response> {
  const headers = buildHeaders(opts, { "Content-Type": "application/json" });
  return SELF.fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

export async function apiDelete(path: string, opts: RequestInit = {}): Promise<Response> {
  return SELF.fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: buildHeaders(opts),
  });
}
