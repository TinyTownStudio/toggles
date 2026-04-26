import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { IconChevronRight, IconTrash } from "@tabler/icons-react";
import { AuthModel } from "../../models/auth";
import { ProjectsModel } from "../../models/projects";
import { TogglesModel } from "../../models/toggles";
import { OrganizationsModel } from "../../models/organizations";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
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
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [metaRows, setMetaRows] = useState<MetaRow[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setShowModal(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      togglesModel.search(id, query);
    }, 300);
  };

  const openMeta = (t: Toggle) => {
    const rows = metaToRows(t.meta);
    setMetaRows(rows.length > 0 ? rows : [{ key: "", value: "" }]);
    setEditingMetaId(t.id);
  };

  const closeMeta = () => {
    setEditingMetaId(null);
    setMetaRows([]);
  };

  const handleSaveMeta = async (toggleId: string) => {
    await togglesModel.saveMeta(id, toggleId, rowsToMeta(metaRows));
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
        <div class="mb-8">
          <a
            href="/app/projects"
            class="text-xs text-content-tertiary hover:text-content transition-colors mb-2 inline-block"
          >
            ← Projects
          </a>
          <div class="flex items-center justify-between gap-4">
            <h1 class="text-2xl font-bold tracking-tight text-content">
              {project?.name ?? "Project"}
            </h1>
            <div class="flex items-center gap-2">
              <Input
                type="search"
                value={searchQuery}
                onInput={(e) => handleSearch((e.target as HTMLInputElement).value)}
                placeholder="Search…"
                class="w-48"
              />
              <Button onClick={() => setShowModal(true)}>New Flag</Button>
            </div>
          </div>
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

        {togglesModel.toggles.value.length === 0 ? (
          <p class="text-content-tertiary text-sm">
            {searchQuery ? "No flags match your search." : "No flags yet."}
          </p>
        ) : (
          <ul class="space-y-2">
            {togglesModel.toggles.value.map((t) => {
              const isOpen = editingMetaId === t.id;
              const metaEntries = t.meta ? Object.entries(t.meta) : [];
              const hasMeta = metaEntries.length > 0;

              return (
                <li
                  key={t.id}
                  class="rounded-lg border border-edge bg-page hover:border-edge-hover transition-colors"
                >
                  <div class="flex items-start gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => (isOpen ? closeMeta() : openMeta(t))}
                      aria-expanded={isOpen}
                      class="min-w-0 flex-1 text-left group"
                    >
                      <div class="flex items-center gap-2">
                        <IconChevronRight
                          size={14}
                          stroke={2}
                          aria-hidden="true"
                          className={`shrink-0 text-content-faint transition-transform duration-100 ${
                            isOpen ? "rotate-90" : ""
                          }`}
                        />
                        <span class="text-content text-sm font-mono truncate">{t.key}</span>
                      </div>
                      {!isOpen && (
                        <div class="mt-1 ml-[22px] flex flex-wrap items-center gap-1.5">
                          {hasMeta ? (
                            metaEntries.slice(0, 3).map(([key, value]) => (
                              <span
                                key={key}
                                class="inline-flex max-w-[12rem] items-center gap-1 rounded-md bg-raised px-1.5 py-0.5 text-[11px] text-content-tertiary"
                              >
                                <span class="font-mono truncate">{key}</span>
                                <span class="text-content-faint">=</span>
                                <span class="truncate">{value}</span>
                              </span>
                            ))
                          ) : (
                            <span class="text-[11px] text-content-faint group-hover:text-content-tertiary transition-colors">
                              Add metadata…
                            </span>
                          )}
                          {metaEntries.length > 3 && (
                            <span class="text-[11px] text-content-faint">
                              +{metaEntries.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    <div class="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={t.enabled}
                        aria-label={t.enabled ? "Disable flag" : "Enable flag"}
                        onClick={() => togglesModel.toggle(id, t.id, !t.enabled)}
                        class={`relative mt-0.5 inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${
                          t.enabled ? "bg-accent" : "bg-raised-hover"
                        }`}
                      >
                        <span
                          class={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            t.enabled ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <Button
                        type="button"
                        variant="danger-icon"
                        aria-label="Delete flag"
                        onClick={() => togglesModel.remove(id, t.id)}
                      >
                        <IconTrash size={16} stroke={2} />
                      </Button>
                    </div>
                  </div>

                  {isOpen && (
                    <div class="border-t border-edge px-4 py-3 space-y-2">
                      <p class="text-xs font-medium text-content-tertiary uppercase tracking-wide mb-1">
                        Metadata
                      </p>
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setMetaRows([...metaRows, { key: "", value: "" }])}
                        >
                          + Add field
                        </Button>
                        <div class="flex-1" />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={closeMeta}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={togglesModel.saving.value}
                          onClick={() => handleSaveMeta(t.id)}
                        >
                          {togglesModel.saving.value ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showModal && (
        <Modal title="New Flag" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} class="flex flex-col gap-4">
            <Input
              type="text"
              value={newKey}
              onInput={(e) => setNewKey((e.target as HTMLInputElement).value)}
              placeholder="Flag key (e.g. dark-mode)"
              disabled={togglesModel.creating.value}
              autoFocus
            />
            <div class="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={togglesModel.creating.value || !newKey.trim()}>
                {togglesModel.creating.value ? "Adding…" : "Add Flag"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
