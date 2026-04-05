import { useModel } from "@preact/signals";
import { useLocation } from "preact-iso";
import { useEffect, useState } from "preact/hooks";

import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ApiKeysModel } from "../../models/apiKeys";
import { AuthModel } from "../../models/auth";
import { ProjectsModel } from "../../models/projects";
import { timeAgo } from "../../lib/date";
import type { Project, TokenType } from "../../lib/api";

export function ApiKeys() {
  const { route } = useLocation();
  const auth = useModel(AuthModel);
  const apiKeyModel = useModel(ApiKeysModel);
  const projectsModel = useModel(ProjectsModel);
  const [newName, setNewName] = useState("");
  const [newProjectId, setNewProjectId] = useState<string>("__all__");
  const [newType, setNewType] = useState<TokenType>("read");
  const [newKey, setNewKey] = useState<string | null>(null);

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
        return;
      }
      apiKeyModel.fetch();
      projectsModel.fetch();
    });
  }, []);

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    const projectId = newProjectId === "__all__" ? null : newProjectId;
    const key = await apiKeyModel.create(newName.trim() || "Unnamed", projectId, newType);
    if (key) {
      setNewKey(key);
      setNewName("");
      setNewProjectId("__all__");
      setNewType("read");
    }
  };

  const projectName = (id: string | null) => {
    if (!id) return "All projects";
    return projectsModel.projects.value.find((p: Project) => p.id === id)?.name ?? id;
  };

  if (apiKeyModel.loading.value) {
    return (
      <div class="min-h-screen bg-page flex items-center justify-center">
        <p class="text-content-tertiary text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div class="min-h-screen pt-16 bg-page">
      <div class="max-w-2xl mx-auto px-4 py-12">
        <div class="flex items-center justify-between mb-8">
          <h1 class="text-2xl font-bold text-content">API Keys</h1>
          <Button variant="ghost" size="sm" onClick={() => route("/docs")}>
            API Documentation &rarr;
          </Button>
        </div>

        {newKey && (
          <Alert variant="success" class="mb-6">
            <p class="font-medium mb-2">API key created. Copy it now - it won't be shown again.</p>
            <code class="block bg-black/10 rounded px-2 py-1.5 text-xs break-all font-mono mb-2">
              {newKey}
            </code>
            <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>
              Dismiss
            </Button>
          </Alert>
        )}

        {apiKeyModel.error.value && <Alert class="mb-6">{apiKeyModel.error.value}</Alert>}

        <form onSubmit={handleCreate} class="space-y-3 mb-8">
          <div class="flex gap-2">
            <Input
              type="text"
              value={newName}
              onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
              placeholder="Key name (optional)"
              disabled={apiKeyModel.creating.value}
              class="flex-1"
            />
          </div>
          <div class="flex gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType((e.target as HTMLSelectElement).value as TokenType)}
              disabled={apiKeyModel.creating.value}
              class="rounded-lg border border-edge bg-page text-content text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="read">Read</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={newProjectId}
              onChange={(e) => setNewProjectId((e.target as HTMLSelectElement).value)}
              disabled={apiKeyModel.creating.value}
              class="flex-1 rounded-lg border border-edge bg-page text-content text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="__all__">All projects</option>
              {projectsModel.projects.value.map((p: Project) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={apiKeyModel.creating.value}>
              {apiKeyModel.creating.value ? "Creating…" : "Create Key"}
            </Button>
          </div>
        </form>

        {apiKeyModel.apiKeys.value.length === 0 ? (
          <p class="text-content-tertiary text-sm">No API keys yet.</p>
        ) : (
          <ul class="space-y-2">
            {apiKeyModel.apiKeys.value.map((key) => (
              <li
                key={key.id}
                class="flex items-center justify-between px-4 py-3 rounded-xl border border-edge bg-surface"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-medium text-content">{key.name ?? "Unnamed"}</p>
                    <TypeBadge type={key.type} />
                    <ScopeBadge permissions={key.permissions} projectName={projectName} />
                  </div>
                  <p class="text-xs text-content-tertiary font-mono mt-0.5">{key.start}••••••••</p>
                  <p class="text-xs text-content-tertiary mt-1">
                    Created {timeAgo(new Date(key.createdAt * 1000))}
                    {" · "}
                    {key.lastUsedAt
                      ? `Last used ${timeAgo(new Date(key.lastUsedAt * 1000))}`
                      : "Never used"}
                  </p>
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

interface TypeBadgeProps {
  type: TokenType;
}

function TypeBadge({ type }: TypeBadgeProps) {
  if (type === "admin") {
    return (
      <span class="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-medium">
        admin
      </span>
    );
  }
  return (
    <span class="text-xs px-1.5 py-0.5 rounded bg-raised border border-edge text-content-tertiary">
      read
    </span>
  );
}

interface ScopeBadgeProps {
  permissions: Record<string, string[]> | null;
  projectName: (id: string | null) => string;
}

function ScopeBadge({ permissions, projectName }: ScopeBadgeProps) {
  const actions = permissions?.projects ?? [];
  // Find a scoped entry (contains a dot, e.g. "read.abc" or "write.abc")
  const scopedEntry = actions.find((a) => a.includes("."));
  if (!scopedEntry) {
    return (
      <span class="text-xs px-1.5 py-0.5 rounded bg-raised border border-edge text-content-tertiary font-mono">
        All projects
      </span>
    );
  }
  // Extract projectId from the first scoped entry (after the first dot)
  const projectId = scopedEntry.slice(scopedEntry.indexOf(".") + 1);
  return (
    <span class="text-xs px-1.5 py-0.5 rounded bg-raised border border-edge text-content-tertiary font-mono">
      {projectName(projectId)}
    </span>
  );
}
