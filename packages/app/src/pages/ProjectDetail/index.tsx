import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { AuthModel } from "../../models/auth";
import { ProjectsModel } from "../../models/projects";
import { TogglesModel } from "../../models/toggles";
import { OrganizationsModel } from "../../models/organizations";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Alert } from "../../components/ui/Alert";
import type { Toggle } from "../../lib/api";

type MetaRow = { key: string; value: string };

function metaToRows(meta: Toggle["meta"]): MetaRow[] {
  if (!meta) return [];
  return Object.entries(meta).map(([key, value]) => ({ key, value }));
}

function rowsToMeta(rows: MetaRow[]): Record<string, string> {
  return Object.fromEntries(rows.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value]));
}

export function ProjectDetail({ id }: { id: string }) {
  const auth = useModel(AuthModel);
  const projectsModel = useModel(ProjectsModel);
  const togglesModel = useModel(TogglesModel);
  const orgsModel = useModel(OrganizationsModel);
  const { route } = useLocation();
  const [newKey, setNewKey] = useState("");
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [metaRows, setMetaRows] = useState<MetaRow[]>([]);

  // Workspace association state
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [workspaceSaved, setWorkspaceSaved] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  useEffect(() => {
    auth.checkSession().then(async () => {
      if (!auth.authenticated.value) {
        route("/auth");
        return;
      }
      await Promise.all([
        projectsModel.projects.value.length === 0 ? projectsModel.fetch() : Promise.resolve(),
        togglesModel.fetch(id),
        orgsModel.orgs.value.length === 0 ? orgsModel.fetchOrgs() : Promise.resolve(),
      ]);
    });
  }, [id]);

  // When project loads, initialise workspace dropdowns to current values
  useEffect(() => {
    const project = projectsModel.projects.value.find((p) => p.id === id);
    if (project) {
      setSelectedOrgId(project.organizationId ?? "");
      setSelectedTeamId(project.teamId ?? "");
    }
  }, [projectsModel.projects.value, id]);

  // When org selection changes, load teams for that org
  useEffect(() => {
    if (selectedOrgId) {
      orgsModel.fetchTeams(selectedOrgId);
    }
  }, [selectedOrgId]);

  if (auth.loading.value || togglesModel.loading.value) {
    return (
      <div class="min-h-screen bg-page pt-16 flex items-center justify-center">
        <p class="text-content-tertiary text-sm">Loading...</p>
      </div>
    );
  }

  const project = projectsModel.projects.value.find((p: { id: string }) => p.id === id);

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    const key = newKey.trim();
    if (!key) return;
    await togglesModel.create(id, key);
    setNewKey("");
  };

  const openMeta = (t: Toggle) => {
    setMetaRows(metaToRows(t.meta));
    setEditingMetaId(t.id);
  };

  const closeMeta = () => {
    setEditingMetaId(null);
    setMetaRows([]);
  };

  const handleSaveMeta = async (toggleId: string) => {
    await togglesModel.saveMeta(id, toggleId, rowsToMeta(metaRows));
    closeMeta();
  };

  const handleSaveWorkspace = async (e: Event) => {
    e.preventDefault();
    setSavingWorkspace(true);
    setWorkspaceSaved(false);
    setWorkspaceError(null);
    try {
      await projectsModel.update(id, selectedOrgId || null, selectedTeamId || null);
      setWorkspaceSaved(true);
      setTimeout(() => setWorkspaceSaved(false), 3000);
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingWorkspace(false);
    }
  };

  // Teams filtered to the currently selected org
  const availableTeams = selectedOrgId
    ? orgsModel.teams.value.filter((t) => t.organizationId === selectedOrgId)
    : [];

  // Is the current user the project owner?
  const isOwner = project?.userId === auth.user?.value?.id;

  return (
    <div class="min-h-screen bg-page pt-16">
      <div class="max-w-5xl mx-auto px-6 py-12">
        <div class="mb-6">
          <a
            href="/app/projects"
            class="text-xs text-content-tertiary hover:text-content transition-colors mb-2 inline-block"
          >
            ← Projects
          </a>
          <h1 class="text-2xl font-bold tracking-tight text-content">
            {project?.name ?? "Project"}
          </h1>
        </div>

        {/* Workspace association */}
        {isOwner && (
          <div class="bg-surface border border-edge rounded-xl p-5 mb-8">
            <h2 class="text-sm font-semibold text-content mb-4">Workspace</h2>
            {workspaceError && <Alert class="mb-3">{workspaceError}</Alert>}
            {workspaceSaved && (
              <Alert variant="success" class="mb-3">
                Workspace association saved.
              </Alert>
            )}
            <form onSubmit={handleSaveWorkspace} class="flex flex-wrap gap-3 items-end">
              <div class="flex flex-col gap-1">
                <label for="ws-org" class="text-xs text-content-tertiary font-medium">
                  Workspace
                </label>
                <select
                  id="ws-org"
                  class="h-9 rounded-lg border border-edge bg-page text-content text-sm px-2 focus:outline-none focus:ring-2 focus:ring-accent min-w-40"
                  value={selectedOrgId}
                  onChange={(e) => {
                    setSelectedOrgId((e.target as HTMLSelectElement).value);
                    setSelectedTeamId("");
                  }}
                  disabled={savingWorkspace}
                >
                  <option value="">None</option>
                  {orgsModel.orgs.value.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedOrgId && (
                <div class="flex flex-col gap-1">
                  <label for="ws-team" class="text-xs text-content-tertiary font-medium">
                    Team (optional)
                  </label>
                  <select
                    id="ws-team"
                    class="h-9 rounded-lg border border-edge bg-page text-content text-sm px-2 focus:outline-none focus:ring-2 focus:ring-accent min-w-40"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId((e.target as HTMLSelectElement).value)}
                    disabled={savingWorkspace}
                  >
                    <option value="">Org-wide</option>
                    {availableTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button type="submit" size="sm" disabled={savingWorkspace}>
                {savingWorkspace ? "Saving…" : "Save"}
              </Button>
            </form>
          </div>
        )}

        {togglesModel.error.value && (
          <p class="text-sm text-error-text mb-4">{togglesModel.error.value}</p>
        )}

        <form onSubmit={handleCreate} class="flex gap-2 mb-8">
          <Input
            type="text"
            value={newKey}
            onInput={(e) => setNewKey((e.target as HTMLInputElement).value)}
            placeholder="Flag key (e.g. dark-mode)"
            disabled={togglesModel.creating.value}
            class="flex-1"
          />
          <Button type="submit" disabled={togglesModel.creating.value || !newKey.trim()}>
            {togglesModel.creating.value ? "Adding…" : "Add flag"}
          </Button>
        </form>

        {togglesModel.toggles.value.length === 0 ? (
          <p class="text-content-tertiary text-sm">No flags yet.</p>
        ) : (
          <ul class="space-y-2">
            {togglesModel.toggles.value.map((t) => (
              <li
                key={t.id}
                class="rounded-lg border border-edge bg-page hover:border-edge-hover transition-colors"
              >
                {/* Main row */}
                <div class="flex items-center justify-between px-4 py-3">
                  <span class="text-content text-sm font-mono">{t.key}</span>
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => (editingMetaId === t.id ? closeMeta() : openMeta(t))}
                      class="text-xs text-content-tertiary hover:text-content transition-colors"
                    >
                      {editingMetaId === t.id ? "Cancel" : "Meta"}
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={t.enabled}
                      onClick={() => togglesModel.toggle(id, t.id, !t.enabled)}
                      class={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                        t.enabled ? "bg-accent" : "bg-raised-hover"
                      }`}
                    >
                      <span
                        class={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          t.enabled ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglesModel.remove(id, t.id)}
                      class="text-xs text-content-faint hover:text-error-text transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Meta editor */}
                {editingMetaId === t.id && (
                  <div class="border-t border-edge px-4 py-3 space-y-2">
                    {metaRows.map((row, i) => (
                      <div key={i} class="flex items-center gap-2">
                        <Input
                          type="text"
                          value={row.key}
                          onInput={(e) => {
                            const updated = [...metaRows];
                            updated[i] = {
                              ...updated[i],
                              key: (e.target as HTMLInputElement).value,
                            };
                            setMetaRows(updated);
                          }}
                          placeholder="key"
                          class="flex-1 font-mono text-xs"
                        />
                        <Input
                          type="text"
                          value={row.value}
                          onInput={(e) => {
                            const updated = [...metaRows];
                            updated[i] = {
                              ...updated[i],
                              value: (e.target as HTMLInputElement).value,
                            };
                            setMetaRows(updated);
                          }}
                          placeholder="value"
                          class="flex-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setMetaRows(metaRows.filter((_, idx) => idx !== i))}
                          class="text-content-faint hover:text-error-text transition-colors text-sm leading-none px-1"
                          aria-label="Remove field"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div class="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setMetaRows([...metaRows, { key: "", value: "" }])}
                        class="text-xs text-content-tertiary hover:text-content transition-colors"
                      >
                        + Add field
                      </button>
                      <div class="flex-1" />
                      <Button
                        type="button"
                        disabled={togglesModel.saving.value}
                        onClick={() => handleSaveMeta(t.id)}
                      >
                        {togglesModel.saving.value ? "Saving…" : "Save"}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
