import type {
  EvaluationContext,
  JsonValue,
  Logger,
  Provider,
  ResolutionDetails,
} from "@openfeature/server-sdk";

export interface TogglesOpenFeatureProviderOptions {
  baseUrl: string;
  projectId: string;
  apiKey: string;
  fetch?: typeof fetch;
}

interface RemoteEvaluationResponse {
  key: string;
  value: boolean;
  variant: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

type ProviderErrorCode = "FLAG_NOT_FOUND" | "PERMISSION_DENIED" | "TYPE_MISMATCH" | "GENERAL";

interface ProviderErrorLike extends Error {
  code?: ProviderErrorCode;
}

export class TogglesOpenFeatureProvider implements Provider {
  readonly runsOn = "server" as const;
  readonly metadata = { name: "toggles-openfeature-provider" } as const;

  private readonly baseUrl: string;
  private readonly projectId: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TogglesOpenFeatureProviderOptions) {
    this.baseUrl = options.baseUrl.trim().replace(/\/$/, "");
    this.projectId = options.projectId.trim();
    this.apiKey = options.apiKey.trim();
    this.fetchImpl = options.fetch ?? fetch;

    if (!this.baseUrl) throw new Error("baseUrl is required");
    if (!this.projectId) throw new Error("projectId is required");
    if (!this.apiKey) throw new Error("apiKey is required");
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    _context: EvaluationContext,
    _logger: Logger,
  ): Promise<ResolutionDetails<boolean>> {
    const evaluation = await this.fetchEvaluation(flagKey);
    return {
      value: evaluation.value,
      variant: evaluation.variant,
      reason: evaluation.reason,
      flagMetadata: (evaluation.metadata ?? {}) as Record<string, string | number | boolean>,
    };
  }

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<string>> {
    await this.resolveBooleanEvaluation(flagKey, false, context, logger);

    const err = new Error(
      `Flag \"${flagKey}\" is boolean but string default was requested`,
    ) as ProviderErrorLike;
    err.code = "TYPE_MISMATCH";
    throw err;
  }

  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<number>> {
    await this.resolveBooleanEvaluation(flagKey, false, context, logger);

    const err = new Error(
      `Flag \"${flagKey}\" is boolean but number default was requested`,
    ) as ProviderErrorLike;
    err.code = "TYPE_MISMATCH";
    throw err;
  }

  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
    logger: Logger,
  ): Promise<ResolutionDetails<T>> {
    await this.resolveBooleanEvaluation(flagKey, false, context, logger);

    const err = new Error(
      `Flag \"${flagKey}\" is boolean but object default was requested`,
    ) as ProviderErrorLike;
    err.code = "TYPE_MISMATCH";
    throw err;
  }

  private async fetchEvaluation(flagKey: string): Promise<RemoteEvaluationResponse> {
    const url = `${this.baseUrl}/api/v1/projects/${encodeURIComponent(this.projectId)}/evaluate/${encodeURIComponent(flagKey)}`;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
    } catch {
      const err = new Error("Failed to reach Toggles API") as ProviderErrorLike;
      err.code = "GENERAL";
      throw err;
    }

    if (!response.ok) {
      const err = new Error(`Toggles API returned HTTP ${response.status}`) as ProviderErrorLike;
      if (response.status === 404) err.code = "FLAG_NOT_FOUND";
      else if (response.status === 401 || response.status === 403) err.code = "PERMISSION_DENIED";
      else err.code = "GENERAL";
      throw err;
    }

    const payload = (await response.json()) as RemoteEvaluationResponse;
    if (typeof payload.value !== "boolean") {
      const err = new Error("Toggles evaluation returned non-boolean value") as ProviderErrorLike;
      err.code = "TYPE_MISMATCH";
      throw err;
    }

    return payload;
  }
}
