import { signal, createModel } from "@preact/signals";
import { getToggles, createToggle, updateToggle, deleteToggle, type Toggle } from "../lib/api";

export const TogglesModel = createModel(() => {
  const loading = signal(true);
  const toggles = signal<Toggle[]>([]);
  const error = signal<string | null>(null);
  const creating = signal(false);

  const fetch = async (projectId: string) => {
    loading.value = true;
    error.value = null;
    try {
      toggles.value = await getToggles(projectId);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load toggles";
    } finally {
      loading.value = false;
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
      const updated = await updateToggle(projectId, id, enabled);
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

  return { loading, toggles, error, creating, fetch, create, toggle, remove };
});
