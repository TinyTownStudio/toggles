import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { AuthModel } from "../../models/auth";
import { ProjectsModel } from "../../models/projects";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

export function Projects() {
  const auth = useModel(AuthModel);
  const projectsModel = useModel(ProjectsModel);
  const { route } = useLocation();
  const [newName, setNewName] = useState("");

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      } else {
        projectsModel.fetch();
      }
    });
  }, []);

  if (auth.loading.value || projectsModel.loading.value) {
    return (
      <div class="min-h-screen bg-page pt-16 flex items-center justify-center">
        <p class="text-content-tertiary text-sm">Loading...</p>
      </div>
    );
  }

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await projectsModel.create(name);
    setNewName("");
  };

  return (
    <div class="min-h-screen bg-page pt-16">
      <div class="max-w-4xl mx-auto px-6 py-12">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-semibold tracking-tight text-content">
            Projects
          </h1>
        </div>

        {projectsModel.error.value && (
          <p class="text-sm text-error-text mb-4">
            {projectsModel.error.value}
          </p>
        )}

        <form onSubmit={handleCreate} class="flex gap-2 mb-8">
          <Input
            type="text"
            value={newName}
            onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
            placeholder="New project name"
            disabled={projectsModel.creating.value}
            class="flex-1"
          />
          <Button
            type="submit"
            disabled={projectsModel.creating.value || !newName.trim()}
          >
            {projectsModel.creating.value ? "Creating…" : "Create"}
          </Button>
        </form>

        {projectsModel.projects.value.length === 0 ? (
          <p class="text-content-tertiary text-sm">No projects yet.</p>
        ) : (
          <ul class="space-y-2">
            {projectsModel.projects.value.map((project: any) => (
              <li
                key={project.id}
                class="flex hover:cursor-pointer items-center justify-between px-4 py-3 rounded-md border border-edge bg-page hover:border-edge-hover transition-colors"
                onClick={() => {
                  route(`/app/projects/${project.id}`);
                }}
              >
                <div class="text-content text-sm font-medium">
                  <p class="m-0 p-0">{project.name}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    projectsModel.remove(project.id);
                  }}
                  class="text-xs text-content-faint hover:text-error-text transition-colors"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
