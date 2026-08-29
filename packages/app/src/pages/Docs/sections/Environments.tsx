import { SectionHeading, SubHeading } from "../headings";
import { Endpoint } from "../Endpoint";

const BASE = "https://toggles.tinytown.studio";

export function Environments() {
  return (
    <div class="mt-14">
      <SectionHeading id="environments">Environments</SectionHeading>
      <p class="text-sm text-content-tertiary leading-relaxed mb-8">
        Environments organize deployment stages (e.g. staging vs production) within a project. Each
        environment stores its own flag enabled state and metadata. Use environments to scope API
        keys and pass <code class="text-xs">?env=&lt;slug&gt;</code> on toggle endpoints to read or
        update values for a specific environment.
      </p>

      <SubHeading id="environments-list">List environments</SubHeading>
      <Endpoint
        method="GET"
        path="/api/v1/projects/:projectId/environments"
        description="Returns all environments for a project. Creates a default Production environment lazily if none exist."
        authNote="Readable with any API key scoped to this project (read or admin), or session auth."
        responseExample={`[
  {
    "id": "env_01hz...",
    "projectId": "proj_01hz...",
    "name": "Production",
    "slug": "production",
    "isDefault": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]`}
        curlExample={`curl ${BASE}/api/v1/projects/proj_01hz.../environments \\
  -H "Authorization: Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx"`}
        jsExample={`const res = await fetch("${BASE}/api/v1/projects/proj_01hz.../environments", {
  headers: {
    Authorization: "Bearer tgs_xxxxxxxxxxxxxxxxxxxxxxxx",
  },
});
const environments = await res.json();`}
      />

      <SubHeading id="environments-create">Create environment</SubHeading>
      <Endpoint
        method="POST"
        path="/api/v1/projects/:projectId/environments"
        description="Creates a new environment."
        authNote="Requires session auth. Free plan: 3 environments per project."
        requestBody={[
          { field: "name", type: "string", required: true, description: "Display name." },
          {
            field: "slug",
            type: "string",
            required: false,
            description: "URL-safe identifier. Auto-generated from name if omitted.",
          },
        ]}
        responseExample={`{
  "id": "env_01hz...",
  "projectId": "proj_01hz...",
  "name": "Staging",
  "slug": "staging",
  "isDefault": false,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}`}
        curlExample={`curl -X POST ${BASE}/api/v1/projects/proj_01hz.../environments \\
  -H "Cookie: better-auth.session_token=<session>" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Staging"}'`}
        jsExample={`const res = await fetch("${BASE}/api/v1/projects/proj_01hz.../environments", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Staging" }),
});
const environment = await res.json();`}
      />

      <SubHeading id="environments-update">Update environment</SubHeading>
      <Endpoint
        method="PATCH"
        path="/api/v1/projects/:projectId/environments/:id"
        description="Rename an environment or promote it to default."
        authNote="Requires session auth."
        requestBody={[
          { field: "name", type: "string", required: false, description: "New display name." },
          {
            field: "isDefault",
            type: "boolean",
            required: false,
            description: "Set to true to promote this environment to default.",
          },
        ]}
        responseExample={`{
  "id": "env_01hz...",
  "name": "Staging",
  "slug": "staging",
  "isDefault": true
}`}
        curlExample={`curl -X PATCH ${BASE}/api/v1/projects/proj_01hz.../environments/env_01hz... \\
  -H "Cookie: better-auth.session_token=<session>" \\
  -H "Content-Type: application/json" \\
  -d '{"isDefault": true}'`}
        jsExample={`const res = await fetch("${BASE}/api/v1/projects/proj_01hz.../environments/env_01hz...", {
  method: "PATCH",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ isDefault: true }),
});
const environment = await res.json();`}
      />

      <SubHeading id="environments-delete">Delete environment</SubHeading>
      <Endpoint
        method="DELETE"
        path="/api/v1/projects/:projectId/environments/:id"
        description="Deletes a non-default environment. The default environment cannot be deleted."
        authNote="Requires session auth."
        responseExample="204 No Content"
        curlExample={`curl -X DELETE ${BASE}/api/v1/projects/proj_01hz.../environments/env_01hz... \\
  -H "Cookie: better-auth.session_token=<session>"`}
        jsExample={`await fetch("${BASE}/api/v1/projects/proj_01hz.../environments/env_01hz...", {
  method: "DELETE",
  credentials: "include",
});`}
      />
    </div>
  );
}
