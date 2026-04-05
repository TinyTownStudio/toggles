import { SectionHeading, SubHeading } from "../headings";
import { Endpoint } from "../Endpoint";

export function ApiKeys() {
  return (
    <div class="mt-14 mb-20">
      <SectionHeading id="api-keys">API Keys</SectionHeading>
      <p class="text-sm text-content-tertiary leading-relaxed mb-8">
        API keys authenticate server-to-server requests. You can create multiple keys with different
        types and scopes.
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
  );
}
