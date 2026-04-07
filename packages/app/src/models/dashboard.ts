import { signal, createModel } from "@preact/signals";
import { getDashboard, type DashboardResponse } from "../lib/api";

export const DashboardModel = createModel(() => {
  const loading = signal(true);
  const stats = signal<DashboardResponse | null>(null);
  const error = signal<string | null>(null);

  const fetch = async () => {
    loading.value = true;
    error.value = null;
    try {
      stats.value = await getDashboard();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load dashboard";
    } finally {
      loading.value = false;
    }
  };

  return { loading, stats, error, fetch };
});
