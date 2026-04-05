import { useEffect, useRef } from "preact/hooks";
import { useSignal } from "@preact/signals";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavSection {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

interface EndpointProps {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  authNote?: string;
  requestBody?: { field: string; type: string; required: boolean; description: string }[];
  queryParams?: { field: string; type: string; required: boolean; description: string }[];
  responseExample: string;
  curlExample: string;
  jsExample: string;
}

// ---------------------------------------------------------------------------
// Sidebar nav definition
// ---------------------------------------------------------------------------

const NAV: NavSection[] = [
  { id: "introduction", label: "Introduction" },
  {
    id: "authentication",
    label: "Authentication",
    children: [
      { id: "auth-session", label: "Session (cookie)" },
      { id: "auth-bearer", label: "API Key (Bearer)" },
      { id: "auth-key-types", label: "Key types & scopes" },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    children: [
      { id: "projects-list", label: "List projects" },
      { id: "projects-create", label: "Create project" },
      { id: "projects-delete", label: "Delete project" },
    ],
  },
  {
    id: "toggles",
    label: "Toggles",
    children: [
      { id: "toggles-list", label: "List toggles" },
      { id: "toggles-one", label: "Get one toggle" },
      { id: "toggles-create", label: "Create toggle" },
      { id: "toggles-update", label: "Update toggle" },
      { id: "toggles-delete", label: "Delete toggle" },
    ],
  },
  {
    id: "api-keys",
    label: "API Keys",
    children: [
      { id: "apikeys-list", label: "List keys" },
      { id: "apikeys-create", label: "Create key" },
      { id: "apikeys-delete", label: "Revoke key" },
    ],
  },
];

// Flat list of all section ids for IntersectionObserver
const ALL_IDS = NAV.flatMap((s) => [s.id, ...(s.children?.map((c) => c.id) ?? [])]);

// ---------------------------------------------------------------------------
// Small reusable primitives
// ---------------------------------------------------------------------------

function MethodBadge({ method }: { method: EndpointProps["method"] }) {
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

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
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

function ParamTable({
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

function Tabs({ tabs }: { tabs: { label: string; content: preact.ComponentChildren }[] }) {
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

// ---------------------------------------------------------------------------
// Endpoint section
// ---------------------------------------------------------------------------

function Endpoint({
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

// ---------------------------------------------------------------------------
// Section heading helper
// ---------------------------------------------------------------------------

function SectionHeading({ id, children }: { id: string; children: preact.ComponentChildren }) {
  return (
    <h2
      id={id}
      class="text-xl font-semibold text-content mb-6 pt-2 scroll-mt-24 border-b border-edge pb-3"
    >
      {children}
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: preact.ComponentChildren }) {
  return (
    <h3 id={id} class="text-base font-semibold text-content mb-4 mt-10 scroll-mt-24">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({ activeId }: { activeId: string }) {
  return (
    <nav class="space-y-1">
      {NAV.map((section) => (
        <div key={section.id}>
          <a
            href={`#${section.id}`}
            class={`block text-sm py-1 px-3 rounded-lg transition-colors ${
              activeId === section.id
                ? "text-accent-text bg-accent-surface font-medium"
                : "text-content-tertiary hover:text-content hover:bg-surface"
            }`}
          >
            {section.label}
          </a>
          {section.children && (
            <div class="ml-3 mt-0.5 space-y-0.5">
              {section.children.map((child) => (
                <a
                  key={child.id}
                  href={`#${child.id}`}
                  class={`block text-xs py-1 px-3 rounded-lg transition-colors ${
                    activeId === child.id
                      ? "text-accent-text bg-accent-surface font-medium"
                      : "text-content-faint hover:text-content-tertiary hover:bg-surface"
                  }`}
                >
                  {child.label}
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Main Docs page
// ---------------------------------------------------------------------------

export function Docs() {
  const activeId = useSignal("introduction");
  const mobileNavOpen = useSignal(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const headings = ALL_IDS.map((id) => document.getElementById(id)).filter(Boolean);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeId.value = entry.target.id;
            break;
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    for (const el of headings) {
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div class="pt-16">
      {/* Page header */}
      <div class="border-b border-edge bg-surface">
        <div class="max-w-6xl mx-auto px-6 py-10">
          <p class="font-mono text-xs text-content-faint tracking-widest uppercase mb-3">
            Reference
          </p>
          <h1 class="text-3xl font-semibold tracking-tight text-content mb-2">API Documentation</h1>
          <p class="text-sm text-content-tertiary max-w-[60ch] leading-relaxed">
            Everything you need to integrate Toggles into your application. Authenticate with an API
            key and query your feature flags over a simple REST API.
          </p>
          <div class="mt-4 inline-flex items-center gap-2 font-mono text-xs bg-raised border border-edge px-3 py-1.5 rounded-lg text-content-secondary">
            <span class="text-content-faint">Base URL</span>
            <span class="text-accent-text">https://toggles.tinytown.studio</span>
          </div>
        </div>
      </div>

      {/* Mobile nav toggle */}
      <div class="lg:hidden border-b border-edge px-6 py-3 sticky top-16 z-40 bg-overlay-heavy backdrop-blur-lg">
        <button
          type="button"
          class="flex items-center gap-2 text-sm text-content-secondary hover:text-content transition-colors"
          onClick={() => (mobileNavOpen.value = !mobileNavOpen.value)}
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width={2}
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          On this page
        </button>
        {mobileNavOpen.value && (
          <div class="mt-3 pb-2">
            <Sidebar activeId={activeId.value} />
          </div>
        )}
      </div>

      {/* Body: sidebar + content */}
      <div class="max-w-6xl mx-auto px-6 py-10 flex gap-12">
        {/* Sticky sidebar */}
        <aside class="hidden lg:block w-52 flex-shrink-0">
          <div class="sticky top-24">
            <Sidebar activeId={activeId.value} />
          </div>
        </aside>

        {/* Main content */}
        <article class="flex-1 min-w-0 max-w-3xl">
          {/* ----------------------------------------------------------------
              Introduction
          ---------------------------------------------------------------- */}
          <SectionHeading id="introduction">Introduction</SectionHeading>
          <p class="text-sm text-content-tertiary leading-relaxed mb-4">
            The Toggles REST API lets you read and manage feature flags programmatically. All
            endpoints are served from{" "}
            <code class="font-mono text-xs bg-surface border border-edge px-1.5 py-0.5 rounded">
              https://toggles.tinytown.studio/api/v1
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

          {/* ----------------------------------------------------------------
              Authentication
          ---------------------------------------------------------------- */}
          <div class="mt-14">
            <SectionHeading id="authentication">Authentication</SectionHeading>
            <p class="text-sm text-content-tertiary leading-relaxed mb-6">
              The API supports two authentication methods depending on the context.
            </p>

            <SubHeading id="auth-session">Session (cookie-based)</SubHeading>
            <p class="text-sm text-content-tertiary leading-relaxed mb-4">
              When you use the Toggles dashboard, your browser authenticates via a session cookie
              managed by BetterAuth. This is handled automatically — no extra headers needed.
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
            <CodeBlock
              code={`Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx`}
              language="http"
            />
            <p class="text-sm text-content-tertiary leading-relaxed mt-4 mb-6">
              The raw key value is only shown once at creation time. Store it securely — you cannot
              retrieve it later.
            </p>

            <SubHeading id="auth-key-types">Key types &amp; scopes</SubHeading>
            <p class="text-sm text-content-tertiary leading-relaxed mb-4">
              Every API key has a <strong class="text-content font-medium">type</strong> and an
              optional <strong class="text-content font-medium">project scope</strong>.
            </p>
            <div class="rounded-lg border border-edge overflow-hidden mb-6">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-surface border-b border-edge">
                    <th class="text-left px-4 py-2 text-xs font-medium text-content-secondary">
                      Type
                    </th>
                    <th class="text-left px-4 py-2 text-xs font-medium text-content-secondary">
                      Scope
                    </th>
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
              <strong class="text-content-secondary font-medium">Note:</strong> Listing projects,
              creating toggles, updating toggles, and deleting toggles all require an{" "}
              <code class="font-mono">admin</code> key or session auth.{" "}
              <code class="font-mono">read</code> keys can only call the list/get toggle endpoints.
            </p>
          </div>

          {/* ----------------------------------------------------------------
              Projects
          ---------------------------------------------------------------- */}
          <div class="mt-14">
            <SectionHeading id="projects">Projects</SectionHeading>
            <p class="text-sm text-content-tertiary leading-relaxed mb-8">
              Projects are the top-level namespace for your feature flags. Each project has a unique
              ID used to scope all toggle operations.
            </p>

            <SubHeading id="projects-list">List projects</SubHeading>
            <Endpoint
              method="GET"
              path="/api/v1/projects"
              description="Returns all projects owned by the authenticated user."
              authNote="Requires session auth or an admin API key."
              responseExample={`[
  {
    "id": "proj_01hz...",
    "name": "My App",
    "userId": "user_01hz...",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]`}
              curlExample={`curl https://toggles.tinytown.studio/api/v1/projects \\
  -H "Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx"`}
              jsExample={`const res = await fetch("https://toggles.tinytown.studio/api/v1/projects", {
  headers: {
    Authorization: "Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
  },
});
const projects = await res.json();`}
            />

            <SubHeading id="projects-create">Create project</SubHeading>
            <Endpoint
              method="POST"
              path="/api/v1/projects"
              description="Creates a new project. Free plan is limited to 10 projects."
              authNote="Requires session auth or an admin API key."
              requestBody={[
                {
                  field: "name",
                  type: "string",
                  required: true,
                  description: "Display name for the project.",
                },
              ]}
              responseExample={`{
  "id": "proj_01hz...",
  "name": "My New App",
  "userId": "user_01hz...",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}`}
              curlExample={`curl -X POST https://toggles.tinytown.studio/api/v1/projects \\
  -H "Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My New App"}'`}
              jsExample={`const res = await fetch("https://toggles.tinytown.studio/api/v1/projects", {
  method: "POST",
  headers: {
    Authorization: "Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: "My New App" }),
});
const project = await res.json();`}
            />

            <SubHeading id="projects-delete">Delete project</SubHeading>
            <Endpoint
              method="DELETE"
              path="/api/v1/projects/:id"
              description="Permanently deletes a project and all its toggles. This action is irreversible."
              authNote="Requires session auth or an admin API key. You must own the project."
              responseExample={`{ "success": true }`}
              curlExample={`curl -X DELETE https://toggles.tinytown.studio/api/v1/projects/proj_01hz... \\
  -H "Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx"`}
              jsExample={`const res = await fetch("https://toggles.tinytown.studio/api/v1/projects/proj_01hz...", {
  method: "DELETE",
  headers: {
    Authorization: "Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
  },
});`}
            />
          </div>

          {/* ----------------------------------------------------------------
              Toggles
          ---------------------------------------------------------------- */}
          <div class="mt-14">
            <SectionHeading id="toggles">Toggles</SectionHeading>
            <p class="text-sm text-content-tertiary leading-relaxed mb-8">
              Toggles are named boolean flags scoped to a project. Query them at runtime to control
              feature availability without redeployment.
            </p>

            <SubHeading id="toggles-list">List toggles</SubHeading>
            <Endpoint
              method="GET"
              path="/api/v1/projects/:projectId/toggles"
              description="Returns all toggles for the given project."
              authNote="Readable with any API key scoped to this project (read or admin)."
              responseExample={`[
  {
    "id": "tgl_01hz...",
    "key": "new-checkout",
    "enabled": true,
    "projectId": "proj_01hz...",
    "meta": { "description": "New checkout flow" },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-16T08:00:00.000Z"
  }
]`}
              curlExample={`curl https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles \\
  -H "Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx"`}
              jsExample={`const res = await fetch(
  "https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles",
  {
    headers: {
      Authorization: "Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
    },
  }
);
const toggles = await res.json();`}
            />

            <SubHeading id="toggles-one">Get one toggle</SubHeading>
            <Endpoint
              method="GET"
              path="/api/v1/projects/:projectId/toggles/one"
              description="Fetch a single toggle by key name or glob pattern. Use ?flag= for an exact key match or ?pattern= for a glob match (e.g. checkout-*). Returns the first matching toggle."
              authNote="Readable with any API key scoped to this project (read or admin). This is the primary endpoint for runtime flag checks."
              queryParams={[
                {
                  field: "flag",
                  type: "string",
                  required: false,
                  description: "Exact key to look up.",
                },
                {
                  field: "pattern",
                  type: "string",
                  required: false,
                  description: "Glob pattern to match against toggle keys.",
                },
              ]}
              responseExample={`{
  "id": "tgl_01hz...",
  "key": "new-checkout",
  "enabled": true,
  "projectId": "proj_01hz...",
  "meta": {},
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T08:00:00.000Z"
}`}
              curlExample={`# Exact key lookup
curl "https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles/one?flag=new-checkout" \\
  -H "Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx"

# Glob pattern
curl "https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles/one?pattern=checkout-*" \\
  -H "Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx"`}
              jsExample={`// Exact key lookup
const res = await fetch(
  "https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles/one?flag=new-checkout",
  {
    headers: {
      Authorization: "Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
    },
  }
);
const toggle = await res.json();

if (toggle.enabled) {
  // show new checkout
}`}
            />

            <SubHeading id="toggles-create">Create toggle</SubHeading>
            <Endpoint
              method="POST"
              path="/api/v1/projects/:projectId/toggles"
              description="Creates a new toggle in the project. Toggle keys must be unique within a project."
              authNote="Requires an admin API key or session auth."
              requestBody={[
                {
                  field: "key",
                  type: "string",
                  required: true,
                  description: "Unique key identifier for the toggle (e.g. new-checkout).",
                },
                {
                  field: "enabled",
                  type: "boolean",
                  required: false,
                  description: "Initial state. Defaults to false.",
                },
              ]}
              responseExample={`{
  "id": "tgl_01hz...",
  "key": "new-checkout",
  "enabled": false,
  "projectId": "proj_01hz...",
  "meta": {},
  "createdAt": "2024-01-16T08:00:00.000Z",
  "updatedAt": "2024-01-16T08:00:00.000Z"
}`}
              curlExample={`curl -X POST https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles \\
  -H "Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "new-checkout", "enabled": false}'`}
              jsExample={`const res = await fetch(
  "https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key: "new-checkout", enabled: false }),
  }
);
const toggle = await res.json();`}
            />

            <SubHeading id="toggles-update">Update toggle</SubHeading>
            <Endpoint
              method="PATCH"
              path="/api/v1/projects/:projectId/toggles/:id"
              description="Update a toggle's enabled state and/or metadata. Send only the fields you want to change."
              authNote="Requires an admin API key or session auth."
              requestBody={[
                {
                  field: "enabled",
                  type: "boolean",
                  required: false,
                  description: "New enabled state for the toggle.",
                },
                {
                  field: "meta",
                  type: "object",
                  required: false,
                  description: "Arbitrary JSON metadata (e.g. description, owner, rollout %).",
                },
              ]}
              responseExample={`{
  "id": "tgl_01hz...",
  "key": "new-checkout",
  "enabled": true,
  "projectId": "proj_01hz...",
  "meta": { "description": "Enabled for all users" },
  "createdAt": "2024-01-16T08:00:00.000Z",
  "updatedAt": "2024-01-17T12:00:00.000Z"
}`}
              curlExample={`# Flip a toggle on
curl -X PATCH \\
  https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles/tgl_01hz... \\
  -H "Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"enabled": true}'

# Update metadata
curl -X PATCH \\
  https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles/tgl_01hz... \\
  -H "Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"meta": {"description": "Enabled for all users"}}'`}
              jsExample={`// Flip a toggle on
await fetch(
  "https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles/tgl_01hz...",
  {
    method: "PATCH",
    headers: {
      Authorization: "Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled: true }),
  }
);

// Update metadata
await fetch(
  "https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles/tgl_01hz...",
  {
    method: "PATCH",
    headers: {
      Authorization: "Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ meta: { description: "Enabled for all users" } }),
  }
);`}
            />

            <SubHeading id="toggles-delete">Delete toggle</SubHeading>
            <Endpoint
              method="DELETE"
              path="/api/v1/projects/:projectId/toggles/:id"
              description="Permanently deletes a toggle from the project."
              authNote="Requires an admin API key or session auth."
              responseExample={`{ "success": true }`}
              curlExample={`curl -X DELETE \\
  https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles/tgl_01hz... \\
  -H "Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx"`}
              jsExample={`await fetch(
  "https://toggles.tinytown.studio/api/v1/projects/proj_01hz.../toggles/tgl_01hz...",
  {
    method: "DELETE",
    headers: {
      Authorization: "Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
    },
  }
);`}
            />
          </div>

          {/* ----------------------------------------------------------------
              API Keys
          ---------------------------------------------------------------- */}
          <div class="mt-14 mb-20">
            <SectionHeading id="api-keys">API Keys</SectionHeading>
            <p class="text-sm text-content-tertiary leading-relaxed mb-8">
              API keys authenticate server-to-server requests. You can create multiple keys with
              different types and scopes.
            </p>

            <SubHeading id="apikeys-list">List keys</SubHeading>
            <Endpoint
              method="GET"
              path="/api/v1/api-keys"
              description="Returns all API keys belonging to the authenticated user. The raw key value is never returned — only the first few characters (start) for identification."
              authNote="Requires session auth."
              responseExample={`[
  {
    "id": "key_01hz...",
    "name": "Production read key",
    "start": "tgs_xxxx",
    "type": "read",
    "enabled": true,
    "permissions": { "projects": ["read.proj_01hz..."] },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "lastUsedAt": "2024-01-17T09:00:00.000Z",
    "expiresAt": null
  }
]`}
              curlExample={`curl https://toggles.tinytown.studio/api/v1/api-keys \\
  -H "Cookie: better-auth.session_token=<session>"`}
              jsExample={`// Must use session auth (cookie) for this endpoint
const res = await fetch("https://toggles.tinytown.studio/api/v1/api-keys", {
  credentials: "include",
});
const keys = await res.json();`}
            />

            <SubHeading id="apikeys-create">Create key</SubHeading>
            <Endpoint
              method="POST"
              path="/api/v1/api-keys"
              description="Creates a new API key. The full key value is returned only in this response — store it securely. If projectId is provided, the key is scoped to that project only."
              authNote="Requires session auth."
              requestBody={[
                {
                  field: "name",
                  type: "string",
                  required: false,
                  description: "Human-readable label for the key.",
                },
                {
                  field: "type",
                  type: '"read" | "admin"',
                  required: false,
                  description: 'Key capability. Defaults to "read".',
                },
                {
                  field: "projectId",
                  type: "string",
                  required: false,
                  description:
                    "Scope the key to a specific project. Omit for a global (all-projects) key.",
                },
              ]}
              responseExample={`{
  "key": "tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
  "id": "key_01hz...",
  "name": "Production read key",
  "start": "tgs_xxxx",
  "type": "read",
  "enabled": true,
  "createdAt": "2024-01-15T10:30:00.000Z"
}`}
              curlExample={`# Global read key
curl -X POST https://toggles.tinytown.studio/api/v1/api-keys \\
  -H "Cookie: better-auth.session_token=<session>" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Production read key", "type": "read"}'

# Scoped admin key
curl -X POST https://toggles.tinytown.studio/api/v1/api-keys \\
  -H "Cookie: better-auth.session_token=<session>" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "CI deploy key", "type": "admin", "projectId": "proj_01hz..."}'`}
              jsExample={`// Global read key
const res = await fetch("https://toggles.tinytown.studio/api/v1/api-keys", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Production read key",
    type: "read",
  }),
});
const { key } = await res.json();
// Store key securely — it won't be shown again

// Scoped admin key
const res2 = await fetch("https://toggles.tinytown.studio/api/v1/api-keys", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "CI deploy key",
    type: "admin",
    projectId: "proj_01hz...",
  }),
});`}
            />

            <SubHeading id="apikeys-delete">Revoke key</SubHeading>
            <Endpoint
              method="DELETE"
              path="/api/v1/api-keys/:id"
              description="Permanently revokes and deletes an API key. Any requests using this key will immediately start returning 401."
              authNote="Requires session auth. You must own the key."
              responseExample={`{ "success": true }`}
              curlExample={`curl -X DELETE https://toggles.tinytown.studio/api/v1/api-keys/key_01hz... \\
  -H "Cookie: better-auth.session_token=<session>"`}
              jsExample={`await fetch("https://toggles.tinytown.studio/api/v1/api-keys/key_01hz...", {
  method: "DELETE",
  credentials: "include",
});`}
            />
          </div>
        </article>
      </div>
    </div>
  );
}
