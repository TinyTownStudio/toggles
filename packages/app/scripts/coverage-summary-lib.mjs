import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

/**
 * @param {Record<string, { statements: Metric; branches: Metric; functions: Metric; lines: Metric }>} data
 * @param {string} appRoot
 * @param {string} title
 */
export function renderCoverageMarkdown(data, appRoot, title) {
  const total = data.total;
  const lines = [];
  lines.push(`## ${title}\n`);
  lines.push("| Metric | % | Covered | Total |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const key of ["statements", "branches", "functions", "lines"]) {
    const metric = total[key];
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    lines.push(`| ${label} | ${formatPct(metric.pct)} | ${metric.covered} | ${metric.total} |`);
  }
  lines.push("");
  lines.push("### Files (api and src, excluding tests)\n");
  lines.push("| File | Stmts | Branch | Funcs | Lines |");
  lines.push("| --- | ---: | ---: | ---: | ---: |");

  const files = Object.keys(data)
    .filter((key) => key !== "total")
    .map((absolutePath) => {
      let rel = absolutePath;
      if (absolutePath.startsWith("/")) {
        rel = relative(appRoot, absolutePath).replace(/\\/g, "/");
      }
      if (rel.includes("..")) {
        const marker = "packages/app/";
        const idx = absolutePath.replace(/\\/g, "/").indexOf(marker);
        rel = idx >= 0 ? absolutePath.slice(idx + marker.length) : absolutePath;
      }
      return { rel, metrics: data[absolutePath] };
    })
    .filter(
      ({ rel }) =>
        (rel.startsWith("api/") || rel.startsWith("src/")) &&
        !rel.includes("/api/tests/") &&
        !rel.endsWith(".test.ts"),
    )
    .sort((a, b) => a.rel.localeCompare(b.rel));

  for (const { rel, metrics } of files) {
    lines.push(
      `| \`${rel}\` | ${formatPct(metrics.statements.pct)} | ${formatPct(metrics.branches.pct)} | ${formatPct(metrics.functions.pct)} | ${formatPct(metrics.lines.pct)} |`,
    );
  }

  if (files.length === 0) {
    lines.push("| (no instrumented application files in this run) | | | | |");
  }

  lines.push("");
  return lines.join("\n");
}

/** @param {number | "Unknown"} pct */
function formatPct(pct) {
  if (pct === "Unknown") {
    return "n/a";
  }
  return `${pct}%`;
}

/**
 * @param {string} summaryPath
 * @param {string} appRoot
 */
export function loadCoverageSummary(summaryPath) {
  const resolved = resolve(summaryPath);
  if (!existsSync(resolved)) {
    throw new Error(`Coverage summary not found: ${resolved}`);
  }
  return JSON.parse(readFileSync(resolved, "utf8"));
}
