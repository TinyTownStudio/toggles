import type { JSX } from "preact";
import { useSignal } from "@preact/signals";
import type { EndpointProps } from "./types";

export function MethodBadge({ method }: { method: EndpointProps["method"] }) {
  const colors: Record<EndpointProps["method"], string> = {
    GET: "bg-success-surface text-success-text border-success-edge",
    POST: "bg-accent-surface text-accent-text border-accent/30",
    PATCH: "bg-accent-surface text-accent-text border-accent/30",
    DELETE: "bg-error-surface text-error-text border-error-edge",
  };
  return (
    <span
      class={`inline-block font-mono text-xs font-semibold px-2 py-0.5 rounded border ${colors[method]}`}
    >
      {method}
    </span>
  );
}

export function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const copied = useSignal(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      copied.value = true;
      setTimeout(() => (copied.value = false), 1800);
    });
  }

  return (
    <div class="relative group rounded-lg overflow-hidden border border-edge bg-raised">
      <div class="flex items-center justify-between px-4 py-2 border-b border-edge bg-surface">
        <span class="font-mono text-xs text-content-faint">{language}</span>
        <button
          type="button"
          onClick={copy}
          class="text-xs text-content-faint hover:text-content transition-colors"
        >
          {copied.value ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre class="overflow-x-auto p-4 text-xs leading-relaxed text-content-secondary font-mono whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function ParamTable({
  rows,
  title,
}: {
  title: string;
  rows: { field: string; type: string; required: boolean; description: string }[];
}) {
  return (
    <div class="mb-4">
      <p class="text-xs font-mono text-content-faint uppercase tracking-widest mb-2">{title}</p>
      <div class="rounded-lg border border-edge overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-surface border-b border-edge">
              <th class="text-left px-4 py-2 text-xs font-medium text-content-secondary">Field</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-content-secondary">Type</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-content-secondary">
                Required
              </th>
              <th class="text-left px-4 py-2 text-xs font-medium text-content-secondary">
                Description
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-edge">
            {rows.map((r) => (
              <tr key={r.field} class="bg-page hover:bg-surface transition-colors">
                <td class="px-4 py-2.5 font-mono text-xs text-accent-text">{r.field}</td>
                <td class="px-4 py-2.5 font-mono text-xs text-content-tertiary">{r.type}</td>
                <td class="px-4 py-2.5 text-xs text-content-tertiary">
                  {r.required ? (
                    <span class="text-error-text font-medium">Yes</span>
                  ) : (
                    <span class="text-content-faint">No</span>
                  )}
                </td>
                <td class="px-4 py-2.5 text-xs text-content-tertiary">{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Tabs({ tabs }: { tabs: { label: string; content: JSX.Element }[] }) {
  const active = useSignal(0);
  return (
    <div>
      <div class="flex gap-1 mb-3 border-b border-edge">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => (active.value = i)}
            class={`px-3 py-1.5 text-xs font-medium transition-colors rounded-t -mb-px border-b-2 ${
              active.value === i
                ? "text-accent-text border-accent"
                : "text-content-faint border-transparent hover:text-content-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs[active.value].content}
    </div>
  );
}
