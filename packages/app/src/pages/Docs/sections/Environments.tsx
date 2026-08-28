import { SectionHeading, SubHeading } from "../headings";
import { Endpoint } from "../Endpoint";

const BASE = "https://toggles.tinytown.studio";

export function Environments() {
  return (
    <div class="mt-14">
      <SectionHeading id="environments">Environments</SectionHeading>
      <p class="text-sm text-content-tertiary leading-relaxed mb-8">
        Environments let you manage different flag values per deployment stage (e.g. staging vs
        production). The default environment uses toggle.enabled directly; other environments store
        sparse overrides that fall back to the default when unset.
      </p>

      <SubHeading id="environments-list">List environments</SubHeading>
      <Endpoint
        method="GET"
        path="/api/v1/projects/:projectId/environments"
        description="Returns all environments for a project. Creates a default Production environment lazily if none exist."
        authNote="Requires session auth."
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
  -H "Cookie: better-auth.session_token=<session>"`}
        jsExample={`const res = await fetch("${BASE}/api/v1/projects/proj_01hz.../environments", {
  credentials: "include",
});
const environments = await res.json();`}
      />

      <SubHeading id="environments-create">Create environment</SubHeading>
      <Endpoint
        method="POST"
        path="/api/v1/projects/:projectId/environments"
        description="Creates a new environment. New environments inherit all flag values from the default environment."
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
        description="Rename an environment or promote it to default. Promoting copies resolved flag values into toggle.enabled."
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
        description="Deletes a non-default environment and its override rows. The default environment cannot be deleted."
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
