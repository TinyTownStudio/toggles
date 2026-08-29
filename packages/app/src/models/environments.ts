import { signal, createModel } from "@preact/signals";
import {
  getEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  type Environment,
} from "../lib/api";

export const EnvironmentsModel = createModel(() => {
  const loading = signal(false);
  const environments = signal<Environment[]>([]);
  const error = signal<string | null>(null);
  const creating = signal(false);

  const fetch = async (projectId: string) => {
    loading.value = true;
    error.value = null;
    try {
      environments.value = await getEnvironments(projectId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load environments";
    } finally {
      loading.value = false;
    }
  };

  const create = async (projectId: string, name: string, slug?: string) => {
    creating.value = true;
    error.value = null;
    try {
      const env = await createEnvironment(projectId, name, slug);
      environments.value = [...environments.value, env];
      return env;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create environment";
      return null;
    } finally {
      creating.value = false;
    }
  };

  const setDefault = async (projectId: string, id: string) => {
    error.value = null;
    try {
      const updated = await updateEnvironment(projectId, id, { isDefault: true });
      environments.value = environments.value.map((e) => ({
        ...e,
        isDefault: e.id === updated.id,
      }));
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to set default environment";
    }
  };

  const remove = async (projectId: string, id: string) => {
    const prev = environments.value;
    environments.value = prev.filter((e) => e.id !== id);
    error.value = null;
    try {
      await deleteEnvironment(projectId, id);
    } catch (err) {
      environments.value = prev;
      error.value = err instanceof Error ? err.message : "Failed to delete environment";
    }
  };

  return {
    loading,
    environments,
    error,
    creating,
    fetch,
    create,
    setDefault,
    remove,
  };
});
