import { signal, createModel } from "@preact/signals";
import {
  createApiKey,
  listApiKeys,
  deleteApiKey,
  type ApiKeyItem,
  type TokenType,
} from "../lib/api";

export type { ApiKeyItem as ApiKey };

export const ApiKeysModel = createModel(() => {
  const loading = signal(true);
  const apiKeys = signal<ApiKeyItem[]>([]);
  const error = signal<string | null>(null);
  const creating = signal(false);

  const fetch = async () => {
    loading.value = true;
    error.value = null;
    try {
      apiKeys.value = await listApiKeys();
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to load API keys";
    } finally {
      loading.value = false;
    }
  };

  // Returns the full plaintext key - only available at creation time
  const create = async (
    name: string,
    projectId: string | null,
    type: TokenType = "read",
  ): Promise<string | null> => {
    creating.value = true;
    error.value = null;
    try {
      const res = await createApiKey(name, projectId, type);
      await fetch();
      return res.key;
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
      await deleteApiKey(id);
    } catch (err) {
      apiKeys.value = prev;
      error.value = err instanceof Error ? err.message : "Failed to revoke API key";
    }
  };

  return { loading, apiKeys, error, creating, fetch, create, revoke };
});
