import { SectionHeading, SubHeading } from "../headings";
import { Endpoint } from "../Endpoint";

export function Projects() {
  return (
    <div class="mt-14">
      <SectionHeading id="projects">Projects</SectionHeading>
      <p class="text-sm text-content-tertiary leading-relaxed mb-8">
        Projects are the top-level namespace for your feature flags. Each project has a unique ID
        used to scope all toggle operations.
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
  );
}
