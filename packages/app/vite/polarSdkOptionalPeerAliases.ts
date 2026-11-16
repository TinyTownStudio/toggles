import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Alias } from "vite";

const stubPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "polarOptionalPeerStubs.ts",
);

const PEER_MODULES = [
  "@opentelemetry/api",
  "ioredis",
  "@opentelemetry/otlp-transformer",
  "@opentelemetry/resources",
  "@opentelemetry/sdk-metrics",
  "@opentelemetry/sdk-trace",
] as const;

/** Resolve @polar-sh/sdk optional peers to local no-op stubs for the Worker bundle. */
export function polarSdkOptionalPeerAliases(): Alias[] {
  return PEER_MODULES.map((find) => ({
    find,
    replacement: stubPath,
  }));
}
