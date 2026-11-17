import { appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCoverageSummary, renderCoverageMarkdown } from "./coverage-summary-lib.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");

function parseArgs(argv) {
  let title = "Test coverage";
  let summaryPath = resolve(appRoot, "coverage/coverage-summary.json");
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--title" && argv[i + 1]) {
      title = argv[++i];
    } else if (arg === "--summary" && argv[i + 1]) {
      summaryPath = resolve(argv[++i]);
    }
  }
  return { title, summaryPath };
}

const { title, summaryPath } = parseArgs(process.argv.slice(2));
const data = loadCoverageSummary(summaryPath);
const markdown = renderCoverageMarkdown(data, appRoot, title);

const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (summaryFile) {
  appendFileSync(summaryFile, `${markdown}\n`);
} else {
  process.stdout.write(`${markdown}\n`);
}
