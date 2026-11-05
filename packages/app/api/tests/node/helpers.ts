import app from "../../index";

const BASE = "http://localhost";

/** Node adapter always passes an env object; an empty object matches self-host (no D1 binding). */
export const nodeBindings = {} as Cloudflare.Env;

export async function signUp(email: string, password: string, name = "Test User"): Promise<string> {
  const res = await app.request(
    `${BASE}/api/auth/sign-up/email`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    },
    nodeBindings,
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`signUp failed ${res.status}: ${text}`);
  }
  return extractCookie(res);
}

function extractCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/^([^;]+)/);
  if (!match) throw new Error(`No cookie in response: ${setCookie}`);
  return match[1];
}

type RequestInit = { cookie?: string; bearer?: string; body?: unknown };

function buildHeaders(opts: RequestInit, extra: Record<string, string> = {}): Headers {
  const h = new Headers(extra);
  if (opts.cookie) h.set("Cookie", opts.cookie);
  if (opts.bearer) h.set("Authorization", `Bearer ${opts.bearer}`);
  return h;
}

export async function apiGet(path: string, opts: RequestInit = {}): Promise<Response> {
  return app.request(
    `${BASE}${path}`,
    {
      headers: buildHeaders(opts),
    },
    nodeBindings,
  );
}

export async function apiPost(path: string, opts: RequestInit = {}): Promise<Response> {
  const headers = buildHeaders(opts, { "Content-Type": "application/json" });
  return app.request(
    `${BASE}${path}`,
    {
      method: "POST",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    },
    nodeBindings,
  );
}

export async function apiPatch(path: string, opts: RequestInit = {}): Promise<Response> {
  const headers = buildHeaders(opts, { "Content-Type": "application/json" });
  return app.request(
    `${BASE}${path}`,
    {
      method: "PATCH",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    },
    nodeBindings,
  );
}
