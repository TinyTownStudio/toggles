import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { AuthModel } from "../../models/auth";
import { ProjectsModel } from "../../models/projects";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";

export function Projects() {
  const auth = useModel(AuthModel);
  const projectsModel = useModel(ProjectsModel);
  const { route } = useLocation();
  const [newName, setNewName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setShowModal(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      projectsModel.search(query);
    }, 300);
  };

  return (
    <div class="min-h-screen bg-page pt-16">
      <div class="max-w-5xl mx-auto px-6 py-12">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-content">Projects</h1>
          <Button onClick={() => setShowModal(true)}>New Project</Button>
        </div>

        <div class="mb-8">
          <Input
            type="search"
            value={searchQuery}
            onInput={(e) => handleSearch((e.target as HTMLInputElement).value)}
            placeholder="Search projects…"
            class="w-full"
          />
        </div>

        {projectsModel.error.value && (
          <p class="text-sm text-error-text mb-4">{projectsModel.error.value}</p>
        )}

        {projectsModel.projects.value.length === 0 ? (
          <p class="text-content-tertiary text-sm">
            {searchQuery ? "No projects match your search." : "No projects yet."}
          </p>
        ) : (
          <ul class="space-y-2">
            {projectsModel.projects.value.map((project: any) => (
              <li
                key={project.id}
                class="flex items-center justify-between rounded-lg border border-edge bg-page hover:border-edge-hover transition-colors"
              >
                <button
                  type="button"
                  class="flex-1 text-left px-4 py-3 cursor-pointer"
                  onClick={() => route(`/app/projects/${project.id}`)}
                >
                  <span class="text-content text-sm font-medium">{project.name}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    projectsModel.remove(project.id);
                  }}
                  class="px-4 text-xs text-content-faint hover:text-error-text transition-colors"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <Modal title="New Project" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} class="flex flex-col gap-4">
            <Input
              type="text"
              value={newName}
              onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
              placeholder="Project name"
              disabled={projectsModel.creating.value}
              autoFocus
            />
            <div class="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={projectsModel.creating.value || !newName.trim()}>
                {projectsModel.creating.value ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
