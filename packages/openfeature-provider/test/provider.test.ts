import { describe, expect, it, vi } from "vitest";
import { TogglesOpenFeatureProvider } from "../src/index";

function createProvider(fetchImpl: typeof fetch) {
  return new TogglesOpenFeatureProvider({
    baseUrl: "https://toggles.example.com",
    projectId: "proj_123",
    apiKey: "tgs_secret",
    fetch: fetchImpl,
  });
}

describe("TogglesOpenFeatureProvider", () => {
  it("resolves boolean evaluation details", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          key: "new-checkout",
          value: true,
          variant: "on",
          reason: "STATIC",
          metadata: { projectId: "proj_123", rollout: 100 },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const provider = createProvider(fetchMock);
    const result = await provider.resolveBooleanEvaluation("new-checkout", false, {}, console);

    expect(result.value).toBe(true);
    expect(result.variant).toBe("on");
    expect(result.reason).toBe("STATIC");
    expect(result.flagMetadata).toEqual({ projectId: "proj_123", rollout: 100 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://toggles.example.com/api/v1/projects/proj_123/evaluate/new-checkout",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer tgs_secret",
        },
      },
    );
  });

  it("maps 404 to FLAG_NOT_FOUND", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 404 }));
    const provider = createProvider(fetchMock);

    await expect(
      provider.resolveBooleanEvaluation("missing", false, {}, console),
    ).rejects.toMatchObject({
      code: "FLAG_NOT_FOUND",
    });
  });

  it("maps 401 and 403 to PERMISSION_DENIED", async () => {
    const unauthorizedFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response("", { status: 403 }));
    const provider = createProvider(unauthorizedFetch);

    await expect(
      provider.resolveBooleanEvaluation("flag", false, {}, console),
    ).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
    await expect(
      provider.resolveBooleanEvaluation("flag", false, {}, console),
    ).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });
  });

  it("maps network failures to GENERAL", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));
    const provider = createProvider(fetchMock);

    await expect(
      provider.resolveBooleanEvaluation("flag", false, {}, console),
    ).rejects.toMatchObject({
      code: "GENERAL",
    });
  });

  it("returns TYPE_MISMATCH for non-boolean resolvers", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            key: "new-checkout",
            value: true,
            variant: "on",
            reason: "STATIC",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
    );
    const provider = createProvider(fetchMock);

    await expect(
      provider.resolveStringEvaluation("new-checkout", "off", {}, console),
    ).rejects.toMatchObject({ code: "TYPE_MISMATCH" });
    await expect(
      provider.resolveNumberEvaluation("new-checkout", 0, {}, console),
    ).rejects.toMatchObject({
      code: "TYPE_MISMATCH",
    });
    await expect(
      provider.resolveObjectEvaluation("new-checkout", { enabled: false }, {}, console),
    ).rejects.toMatchObject({ code: "TYPE_MISMATCH" });
  });

  it("validates required constructor options", () => {
    expect(
      () =>
        new TogglesOpenFeatureProvider({
          baseUrl: "",
          projectId: "proj_123",
          apiKey: "tgs_secret",
        }),
    ).toThrow("baseUrl is required");

    expect(
      () =>
        new TogglesOpenFeatureProvider({
          baseUrl: "https://toggles.example.com",
          projectId: "",
          apiKey: "tgs_secret",
        }),
    ).toThrow("projectId is required");

    expect(
      () =>
        new TogglesOpenFeatureProvider({
          baseUrl: "https://toggles.example.com",
          projectId: "proj_123",
          apiKey: "",
        }),
    ).toThrow("apiKey is required");
  });
});
