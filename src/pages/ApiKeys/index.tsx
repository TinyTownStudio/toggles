import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { AuthModel } from "../../models/auth";
import { ApiKeysModel } from "../../models/apiKeys";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Alert } from "../../components/ui/Alert";

export function ApiKeys() {
  const { route } = useLocation();
  const auth = useModel(AuthModel);
  const apiKeyModel = useModel(ApiKeysModel);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
        return;
      }
      apiKeyModel.fetch();
    });
  }, []);

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    const key = await apiKeyModel.create(newName.trim() || "Unnamed");
    if (key) {
      setNewKey(key);
      setNewName("");
    }
  };

  if (apiKeyModel.loading.value) {
    return (
      <div class="min-h-screen bg-page flex items-center justify-center">
        <p class="text-content-tertiary text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div class="min-h-screen mt-12 bg-page">
      <div class="max-w-2xl mx-auto px-4 py-12">
        <div class="flex items-center justify-between mb-8">
          <h1 class="text-2xl font-bold text-content">API Keys</h1>
          <Button variant="ghost" size="sm" onClick={() => route("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        {newKey && (
          <Alert variant="success" class="mb-6">
            <p class="font-medium mb-2">API key created. Copy it now — it won't be shown again.</p>
            <code class="block bg-black/10 rounded px-2 py-1.5 text-xs break-all font-mono mb-2">
              {newKey}
            </code>
            <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>
              Dismiss
            </Button>
          </Alert>
        )}

        {apiKeyModel.error.value && <Alert class="mb-6">{apiKeyModel.error.value}</Alert>}

        <form onSubmit={handleCreate} class="flex gap-2 mb-8">
          <Input
            type="text"
            value={newName}
            onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
            placeholder="Key name (optional)"
            disabled={apiKeyModel.creating.value}
            class="flex-1"
          />
          <Button type="submit" disabled={apiKeyModel.creating.value}>
            {apiKeyModel.creating.value ? "Creating…" : "Create Key"}
          </Button>
        </form>

        {apiKeyModel.apiKeys.value.length === 0 ? (
          <p class="text-content-tertiary text-sm">No API keys yet.</p>
        ) : (
          <ul class="space-y-2">
            {apiKeyModel.apiKeys.value.map((key) => (
              <li
                key={key.id}
                class="flex items-center justify-between px-4 py-3 rounded-lg border border-edge bg-surface"
              >
                <div>
                  <p class="text-sm font-medium text-content">{key.name ?? "Unnamed"}</p>
                  <p class="text-xs text-content-tertiary font-mono mt-0.5">{key.start}••••••••</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => apiKeyModel.revoke(key.id)}>
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
