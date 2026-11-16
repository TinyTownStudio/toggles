#!/usr/bin/env node
/**
 * End-to-end checks against a running Toggles self-host container.
 * Used from CI on an internal Docker network (no outbound from the app container).
 */

const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const origin = (process.env.REQUEST_ORIGIN ?? baseUrl).replace(/\/$/, "");

const TEST_EMAIL = process.env.E2E_EMAIL ?? "docker-e2e@ci.example";
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? "password1234";
const TEST_NAME = "Docker E2E User";
const FLAG_KEY = "e2e-flag";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function extractCookie(res) {
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/^([^;]+)/);
  if (!match) fail(`No session cookie in response: ${setCookie}`);
  return match[1];
}

async function request(method, path, { cookie, bearer, body } = {}) {
  const headers = { Origin: origin };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function expectStatus(res, status, label) {
  if (res.status !== status) {
    const text = await res.text();
    fail(`${label}: expected HTTP ${status}, got ${res.status}: ${text}`);
  }
}

async function main() {
  const ping = await fetch(`${baseUrl}/ping`);
  if (!ping.ok) fail(`/ping failed: ${ping.status}`);

  const signUpRes = await request("POST", "/api/auth/sign-up/email", {
    body: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
  });
  if (signUpRes.status !== 200 && signUpRes.status !== 201) {
    const text = await signUpRes.text();
    fail(`sign-up failed: ${signUpRes.status}: ${text}`);
  }
  const cookie = extractCookie(signUpRes);

  const projectRes = await request("POST", "/api/v1/projects", {
    cookie,
    body: { name: "Docker E2E Project" },
  });
  await expectStatus(projectRes, 201, "create project");
  const projectId = (await projectRes.json()).id;
  if (!projectId) fail("create project: missing id");

  const envListRes = await request("GET", `/api/v1/projects/${projectId}/environments`, { cookie });
  await expectStatus(envListRes, 200, "list environments");
  const environments = await envListRes.json();
  if (!Array.isArray(environments) || environments.length === 0) {
    fail("list environments: expected default production environment");
  }

  const toggleRes = await request("POST", `/api/v1/projects/${projectId}/toggles`, {
    cookie,
    body: { key: FLAG_KEY },
  });
  await expectStatus(toggleRes, 201, "create toggle");
  const toggle = await toggleRes.json();
  const toggleId = toggle.id;
  if (!toggleId) fail("create toggle: missing id");

  const patchRes = await request("PATCH", `/api/v1/projects/${projectId}/toggles/${toggleId}`, {
    cookie,
    body: { enabled: true },
  });
  await expectStatus(patchRes, 200, "enable toggle");

  const keyRes = await request("POST", "/api/v1/api-keys", {
    cookie,
    body: { name: "E2E Read Key", projectId },
  });
  await expectStatus(keyRes, 201, "create API key");
  const apiKey = (await keyRes.json()).key;
  if (!apiKey) fail("create API key: missing key");

  const listRes = await request("GET", `/api/v1/projects/${projectId}/toggles`, { bearer: apiKey });
  await expectStatus(listRes, 200, "API key list toggles");
  const toggles = await listRes.json();
  const match = toggles.find((t) => t.key === FLAG_KEY);
  if (!match?.enabled) {
    fail(`API key list: expected ${FLAG_KEY} enabled=true, got ${JSON.stringify(match)}`);
  }

  const oneRes = await request(
    "GET",
    `/api/v1/projects/${projectId}/toggles/one?flag=${encodeURIComponent(FLAG_KEY)}`,
    { bearer: apiKey },
  );
  await expectStatus(oneRes, 200, "API key toggles/one");
  const one = await oneRes.json();
  if (!one.enabled) {
    fail(`API key toggles/one: expected enabled=true, got ${JSON.stringify(one)}`);
  }

  const readCount = 25;
  for (let i = 0; i < readCount; i++) {
    const res = await request("GET", `/api/v1/projects/${projectId}/toggles`, { bearer: apiKey });
    if (res.status !== 200) {
      const text = await res.text();
      fail(`rate limit regression (read ${i + 1}/${readCount}): HTTP ${res.status}: ${text}`);
    }
  }

  console.log(
    `Docker e2e OK: sign-up, project, flag, API key reads, and ${readCount} repeated list reads`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
