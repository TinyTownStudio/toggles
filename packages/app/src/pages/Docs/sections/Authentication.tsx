import { CodeBlock } from "../primitives";
import { SectionHeading, SubHeading } from "../headings";

export function Authentication() {
  return (
    <div class="mt-14">
      <SectionHeading id="authentication">Authentication</SectionHeading>
      <p class="text-sm text-content-tertiary leading-relaxed mb-6">
        The API supports two authentication methods depending on the context.
      </p>

      <SubHeading id="auth-session">Session (cookie-based)</SubHeading>
      <p class="text-sm text-content-tertiary leading-relaxed mb-4">
        When you use the Toggles dashboard, your browser authenticates via a session cookie managed
        by BetterAuth. This is handled automatically — no extra headers needed.
      </p>
      <p class="text-sm text-content-tertiary leading-relaxed mb-6">
        Sign in at{" "}
        <a href="/auth" class="text-accent-text hover:underline">
          /auth
        </a>{" "}
        and the session cookie is set. All subsequent requests to{" "}
        <code class="font-mono text-xs bg-surface border border-edge px-1.5 py-0.5 rounded">
          /api/v1/*
        </code>{" "}
        include it automatically (
        <code class="font-mono text-xs bg-surface border border-edge px-1.5 py-0.5 rounded">
          credentials: "include"
        </code>
        ).
      </p>

      <SubHeading id="auth-bearer">API Key (Bearer token)</SubHeading>
      <p class="text-sm text-content-tertiary leading-relaxed mb-4">
        For server-to-server or programmatic access, generate an API key from the{" "}
        <a href="/app/api-keys" class="text-accent-text hover:underline">
          API Keys
        </a>{" "}
        page and pass it as a Bearer token:
      </p>
      <CodeBlock code={`Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx`} language="http" />
      <p class="text-sm text-content-tertiary leading-relaxed mt-4 mb-6">
        The raw key value is only shown once at creation time. Store it securely — you cannot
        retrieve it later.
      </p>

      <SubHeading id="auth-key-types">Key types &amp; scopes</SubHeading>
      <p class="text-sm text-content-tertiary leading-relaxed mb-4">
        Every API key has a <strong class="text-content font-medium">type</strong> and an optional{" "}
        <strong class="text-content font-medium">project scope</strong>.
      </p>
      <div class="rounded-lg border border-edge overflow-hidden mb-6">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-surface border-b border-edge">
              <th class="text-left px-4 py-2 text-xs font-medium text-content-secondary">Type</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-content-secondary">Scope</th>
              <th class="text-left px-4 py-2 text-xs font-medium text-content-secondary">
                Allowed operations
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-edge text-xs">
            <tr class="bg-page">
              <td class="px-4 py-2.5 font-mono text-accent-text">read</td>
              <td class="px-4 py-2.5 text-content-tertiary">global (all projects)</td>
              <td class="px-4 py-2.5 text-content-tertiary">
                Read toggles &amp; projects for any project
              </td>
            </tr>
            <tr class="bg-page">
              <td class="px-4 py-2.5 font-mono text-accent-text">read</td>
              <td class="px-4 py-2.5 text-content-tertiary">scoped (one project)</td>
              <td class="px-4 py-2.5 text-content-tertiary">
                Read toggles for that project only — scope violations return 403
              </td>
            </tr>
            <tr class="bg-page">
              <td class="px-4 py-2.5 font-mono text-accent-text">admin</td>
              <td class="px-4 py-2.5 text-content-tertiary">global</td>
              <td class="px-4 py-2.5 text-content-tertiary">
                Full read + write across all projects
              </td>
            </tr>
            <tr class="bg-page">
              <td class="px-4 py-2.5 font-mono text-accent-text">admin</td>
              <td class="px-4 py-2.5 text-content-tertiary">scoped (one project)</td>
              <td class="px-4 py-2.5 text-content-tertiary">
                Full read + write for that project only
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-content-faint bg-surface border border-edge rounded-lg px-3 py-2 mb-10">
        <strong class="text-content-secondary font-medium">Note:</strong> Listing projects, creating
        toggles, updating toggles, and deleting toggles all require an{" "}
        <code class="font-mono">admin</code> key or session auth.{" "}
        <code class="font-mono">read</code> keys can only call the list/get toggle endpoints.
      </p>
    </div>
  );
}
