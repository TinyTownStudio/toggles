import { signal, createModel } from "@preact/signals";
import { getProjects, createProject, deleteProject, updateProject, type Project } from "../lib/api";

export const ProjectsModel = createModel(() => {
  const loading = signal(true);
  const projects = signal<Project[]>([]);
  const error = signal<string | null>(null);
  const creating = signal(false);

  const fetch = async () => {
    loading.value = true;
    error.value = null;
    try {
      projects.value = await getProjects();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load projects";
    } finally {
      loading.value = false;
    }
  };

  const create = async (name: string) => {
    creating.value = true;
    error.value = null;
    try {
      const project = await createProject(name);
      projects.value = [project, ...projects.value];
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create project";
    } finally {
      creating.value = false;
    }
  };

  const remove = async (id: string) => {
    const prev = projects.value;
    projects.value = prev.filter((p) => p.id !== id);
    try {
      await deleteProject(id);
    } catch (err) {
      projects.value = prev;
      error.value = err instanceof Error ? err.message : "Failed to delete project";
    }
  };

  const update = async (id: string, organizationId: string | null, teamId: string | null) => {
    error.value = null;
    try {
      const updated = await updateProject(id, organizationId, teamId);
      projects.value = projects.value.map((p) => (p.id === id ? updated : p));
      return updated;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update project";
      throw err;
    }
  };

  return { loading, projects, error, creating, fetch, create, remove, update };
});
