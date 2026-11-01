import { CodeBlock } from "../primitives";
import { SectionHeading } from "../headings";
import { API_V1_BASE_URL } from "../../../lib/constants";

export function Introduction() {
  return (
    <>
      <SectionHeading id="introduction">Introduction</SectionHeading>
      <p class="text-sm text-content-tertiary leading-relaxed mb-4">
        The Toggles REST API lets you read and manage feature flags programmatically. All endpoints
        are served from{" "}
        <code class="font-mono text-xs bg-surface border border-edge px-1.5 py-0.5 rounded">
          {API_V1_BASE_URL}
        </code>
        .
      </p>
      <p class="text-sm text-content-tertiary leading-relaxed mb-4">
        All requests and responses use JSON. Successful responses return HTTP{" "}
        <code class="font-mono text-xs bg-surface border border-edge px-1.5 py-0.5 rounded">
          200
        </code>{" "}
        or{" "}
        <code class="font-mono text-xs bg-surface border border-edge px-1.5 py-0.5 rounded">
          201
        </code>
        . Errors return a JSON body with a single{" "}
        <code class="font-mono text-xs bg-surface border border-edge px-1.5 py-0.5 rounded">
          error
        </code>{" "}
        field:
      </p>
      <CodeBlock code={`{ "error": "Not found" }`} language="json" />
    </>
  );
}
