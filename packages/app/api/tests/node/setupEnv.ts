import { afterAll, beforeAll, vi } from "vitest";

const realFetch = globalThis.fetch;

beforeAll(() => {
  vi.stubGlobal("fetch", (...args: Parameters<typeof fetch>) => {
    const input = args[0];
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input instanceof Request
            ? input.url
            : String(input);
    throw new Error(`Outbound fetch blocked in node self-host tests: ${url}`);
  });
});

afterAll(() => {
  vi.stubGlobal("fetch", realFetch);
});
