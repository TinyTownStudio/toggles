import { SectionHeading, SubHeading } from "../headings";
import { Endpoint } from "../Endpoint";

export function Toggles() {
  return (
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
  );
}
