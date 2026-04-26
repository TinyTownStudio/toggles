import { signal, createModel } from "@preact/signals";
import { getProjects, createProject, deleteProject, type Project } from "../lib/api";

export const ProjectsModel = createModel(() => {
  const loading = signal(true);
  const projects = signal<Project[]>([]);
  const error = signal<string | null>(null);
  const creating = signal(false);
  const searching = signal(false);

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

  const search = async (query: string) => {
    searching.value = true;
    error.value = null;
    try {
      projects.value = await getProjects(query);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to search projects";
    } finally {
      searching.value = false;
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

  return { loading, projects, error, creating, searching, fetch, search, create, remove };
});
