/**
 * Empty stand-ins for @polar-sh/sdk optional peers (outpost telemetry and Redis).
 * Toggles does not use Polar Outpost. These aliases satisfy the worker bundle only.
 */

export const INVALID_SPAN_CONTEXT = {};

export const SpanStatusCode = {
  UNSET: 0,
  OK: 1,
  ERROR: 2,
} as const;

export const trace = {
  wrapSpanContext(context: unknown) {
    return context;
  },
  getTracer(_name: string, _version?: string) {
    return {
      startSpan() {
        return {
          end() {},
          setStatus() {},
          recordException() {},
          attributes: {},
          status: { code: SpanStatusCode.UNSET },
        };
      },
    };
  },
};

export class Redis {
  constructor(..._args: unknown[]) {}

  on(_event: string, _handler: (...args: unknown[]) => void) {
    return this;
  }

  connect() {
    return Promise.reject(new Error("Redis is not available in this build"));
  }

  quit() {
    return Promise.resolve("OK");
  }

  disconnect() {}

  pipeline() {
    return {
      exec() {
        return Promise.resolve(null);
      },
    };
  }
}

export const ProtobufMetricsSerializer = {
  serializeRequest() {
    return undefined;
  },
};

export const ProtobufTraceSerializer = {
  serializeRequest() {
    return undefined;
  },
};

export function resourceFromAttributes(_attrs: Record<string, string>) {
  return {};
}

export const AggregationTemporality = {
  DELTA: 1,
  CUMULATIVE: 2,
} as const;

export const AggregationType = {
  DEFAULT: 0,
  EXPONENTIAL_HISTOGRAM: 4,
} as const;

export class MeterProvider {
  constructor(_options?: unknown) {}

  shutdown() {
    return Promise.resolve();
  }
}

export class PeriodicExportingMetricReader {
  constructor(_options?: unknown) {}
}

export class AlwaysOnSampler {}

export class BatchSpanProcessor {
  constructor(_options?: unknown) {}
}

export class TracerProvider {
  constructor(_options?: unknown) {}

  shutdown() {
    return Promise.resolve();
  }
}
