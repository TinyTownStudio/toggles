import { signal, createModel } from "@preact/signals";
import { authClient } from "../lib/auth";

export interface ApiKey {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  enabled: boolean;
}

export const ApiKeysModel = createModel(() => {
  const loading = signal(true);
  const apiKeys = signal<ApiKey[]>([]);
  const error = signal<string | null>(null);
  const creating = signal(false);

  const fetch = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await authClient.apiKey.list();
      apiKeys.value = (res.data ?? []) as unknown as ApiKey[];
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load API keys";
    } finally {
      loading.value = false;
    }
  };

  // Returns the full plaintext key — only available at creation time
  const create = async (name: string): Promise<string | null> => {
    creating.value = true;
    error.value = null;
    try {
      const res = await authClient.apiKey.create({ name });
      if (res.data) {
        await fetch();
        return (res.data as { key: string }).key;
      }
      return null;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create API key";
      return null;
    } finally {
      creating.value = false;
    }
  };

  const revoke = async (id: string) => {
    const prev = apiKeys.value;
    apiKeys.value = prev.filter((k) => k.id !== id);
    try {
      await authClient.apiKey.delete({ keyId: id });
    } catch (err) {
      apiKeys.value = prev;
      error.value = err instanceof Error ? err.message : "Failed to revoke API key";
    }
  };

  return { loading, apiKeys, error, creating, fetch, create, revoke };
});
