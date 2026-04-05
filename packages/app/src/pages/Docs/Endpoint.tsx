import type { EndpointProps } from "./types";
import { MethodBadge, CodeBlock, ParamTable, Tabs } from "./primitives";

export function Endpoint({
  method,
  path,
  description,
  authNote,
  requestBody,
  queryParams,
  responseExample,
  curlExample,
  jsExample,
}: EndpointProps) {
  return (
    <div class="mb-12">
      <div class="flex flex-wrap items-center gap-3 mb-3">
        <MethodBadge method={method} />
        <code class="font-mono text-sm text-content bg-surface border border-edge px-2 py-0.5 rounded">
          {path}
        </code>
      </div>
      <p class="text-sm text-content-tertiary leading-relaxed mb-4">{description}</p>
      {authNote && (
        <p class="text-xs text-accent-text bg-accent-surface border border-accent/20 rounded-lg px-3 py-2 mb-4">
          {authNote}
        </p>
      )}
      {queryParams && queryParams.length > 0 && (
        <ParamTable title="Query parameters" rows={queryParams} />
      )}
      {requestBody && requestBody.length > 0 && (
        <ParamTable title="Request body (JSON)" rows={requestBody} />
      )}
      <div class="mb-4">
        <p class="text-xs font-mono text-content-faint uppercase tracking-widest mb-2">Response</p>
        <CodeBlock code={responseExample} language="json" />
      </div>
      <Tabs
        tabs={[
          { label: "curl", content: <CodeBlock code={curlExample} language="bash" /> },
          { label: "JavaScript", content: <CodeBlock code={jsExample} language="javascript" /> },
        ]}
      />
    </div>
  );
}
