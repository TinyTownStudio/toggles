import { signal, createModel } from "@preact/signals";
import {
  getToggles,
  createToggle,
  updateToggle,
  updateToggleMeta,
  deleteToggle,
  type Toggle,
} from "../lib/api";

export const TogglesModel = createModel(() => {
  const loading = signal(true);
  const toggles = signal<Toggle[]>([]);
  const error = signal<string | null>(null);
  const creating = signal(false);
  const saving = signal(false);
  const searching = signal(false);
  const activeEnvironment = signal<string | null>(null);

  const fetch = async (projectId: string, search?: string, env?: string) => {
    loading.value = true;
    error.value = null;
    const envSlug = env ?? activeEnvironment.value ?? undefined;
    try {
      toggles.value = await getToggles(projectId, search, envSlug);
      if (envSlug) activeEnvironment.value = envSlug;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load toggles";
    } finally {
      loading.value = false;
    }
  };

  const search = async (projectId: string, query: string) => {
    searching.value = true;
    error.value = null;
    try {
      toggles.value = await getToggles(projectId, query, activeEnvironment.value ?? undefined);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to search toggles";
    } finally {
      searching.value = false;
    }
  };

  const create = async (projectId: string, key: string) => {
    creating.value = true;
    error.value = null;
    try {
      const t = await createToggle(projectId, key);
      toggles.value = [t, ...toggles.value];
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create toggle";
    } finally {
      creating.value = false;
    }
  };

  const toggle = async (projectId: string, id: string, enabled: boolean) => {
    const prev = toggles.value;
    toggles.value = prev.map((t) => (t.id === id ? { ...t, enabled } : t));
    try {
      const updated = await updateToggle(
        projectId,
        id,
        enabled,
        activeEnvironment.value ?? undefined,
      );
      toggles.value = toggles.value.map((t) => (t.id === id ? updated : t));
    } catch (err) {
      toggles.value = prev;
      error.value = err instanceof Error ? err.message : "Failed to update toggle";
    }
  };

  const remove = async (projectId: string, id: string) => {
    const prev = toggles.value;
    toggles.value = prev.filter((t) => t.id !== id);
    try {
      await deleteToggle(projectId, id);
    } catch (err) {
      toggles.value = prev;
      error.value = err instanceof Error ? err.message : "Failed to delete toggle";
    }
  };

  const saveMeta = async (
    projectId: string,
    id: string,
    meta: Record<string, string>,
  ): Promise<boolean> => {
    const prev = toggles.value;
    toggles.value = prev.map((t) => (t.id === id ? { ...t, meta } : t));
    saving.value = true;
    error.value = null;
    try {
      const updated = await updateToggleMeta(
        projectId,
        id,
        meta,
        activeEnvironment.value ?? undefined,
      );
      toggles.value = toggles.value.map((t) => (t.id === id ? updated : t));
      return true;
    } catch (err) {
      toggles.value = prev;
      error.value = err instanceof Error ? err.message : "Failed to save meta";
      return false;
    } finally {
      saving.value = false;
    }
  };

  const setActiveEnvironment = (slug: string | null) => {
    activeEnvironment.value = slug;
  };

  return {
    loading,
    toggles,
    error,
    creating,
    saving,
    searching,
    activeEnvironment,
    fetch,
    search,
    create,
    toggle,
    remove,
    saveMeta,
    setActiveEnvironment,
  };
});
