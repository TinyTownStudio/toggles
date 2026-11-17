import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadCoverageSummary, renderCoverageMarkdown } from "./coverage-summary-lib.mjs";

const MARKER = "<!-- toggles-coverage-report -->";
const appRoot = resolve(import.meta.dirname, "..");

function resolveSummaryPath(envKey, fallbackRelative) {
  const fromEnv = process.env[envKey];
  if (fromEnv) {
    return resolve(fromEnv);
  }
  return resolve(appRoot, fallbackRelative);
}

function buildBody() {
  const sections = [];

  const workersPath = resolveSummaryPath(
    "COVERAGE_WORKERS_SUMMARY",
    "coverage/coverage-summary.json",
  );
  const nodePath = resolveSummaryPath("COVERAGE_NODE_SUMMARY", "coverage/coverage-summary.json");

  if (existsSync(workersPath)) {
    const data = loadCoverageSummary(workersPath);
    sections.push(renderCoverageMarkdown(data, appRoot, "Vitest (Cloudflare Workers pool)"));
  } else {
    sections.push("## Vitest (Cloudflare Workers pool)\n\n_No coverage summary artifact._\n");
  }

  if (existsSync(nodePath)) {
    const data = loadCoverageSummary(nodePath);
    sections.push(renderCoverageMarkdown(data, appRoot, "Node + SQLite API tests"));
  } else {
    sections.push("## Node + SQLite API tests\n\n_No coverage summary artifact._\n");
  }

  return [
    MARKER,
    "",
    "Coverage is collected in CI with `@vitest/coverage-istanbul`. Thresholds are not enforced.",
    "",
    ...sections,
  ].join("\n");
}

async function githubRequest(path, init = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required");
  }
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${path} failed (${response.status}): ${text}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER;

  if (!repository || !prNumber) {
    console.log("Skipping PR coverage comment: not a pull request context.");
    return;
  }

  const body = buildBody();
  const [owner, repo] = repository.split("/");
  const comments = await githubRequest(
    `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`,
  );
  const existing = comments.find((comment) => comment.body?.includes(MARKER));

  if (existing) {
    await githubRequest(`/repos/${owner}/${repo}/issues/comments/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
    console.log(`Updated PR coverage comment ${existing.id}.`);
    return;
  }

  await githubRequest(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  console.log("Created PR coverage comment.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
