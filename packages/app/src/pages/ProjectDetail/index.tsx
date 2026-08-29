import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { useEffect, useRef, useState } from "preact/hooks";
import { toast } from "@preachjs/toast";
import { IconChevronRight, IconSettings, IconTrash } from "@tabler/icons-react";
import { AuthModel } from "../../models/auth";
import { ProjectsModel } from "../../models/projects";
import { TogglesModel } from "../../models/toggles";
import { EnvironmentsModel } from "../../models/environments";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import type { Environment, Toggle } from "../../lib/api";

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
  const environmentsModel = useModel(EnvironmentsModel);
  const { route } = useLocation();
  const [newKey, setNewKey] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [metaRows, setMetaRows] = useState<MetaRow[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    auth.checkSession().then(async () => {
      if (!auth.authenticated.value) {
        route("/auth");
        return;
      }
      await Promise.all([
        projectsModel.projects.value.length === 0 ? projectsModel.fetch() : Promise.resolve(),
        environmentsModel.fetch(id),
      ]);
      const defaultEnv =
        environmentsModel.environments.value.find((e) => e.isDefault) ??
        environmentsModel.environments.value[0];
      if (defaultEnv) {
        togglesModel.setActiveEnvironment(defaultEnv.slug);
        await togglesModel.fetch(id, undefined, defaultEnv.slug);
      } else {
        await togglesModel.fetch(id);
      }
    });
  }, [id]);

  if (auth.loading.value || togglesModel.loading.value || environmentsModel.loading.value) {
    return (
      <div class="min-h-screen bg-page pt-16 flex items-center justify-center">
        <p class="text-content-tertiary text-sm">Loading...</p>
      </div>
    );
  }

  const project = projectsModel.projects.value.find((p: { id: string }) => p.id === id);
  const envs = environmentsModel.environments.value;
  const activeSlug = togglesModel.activeEnvironment.value;

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    const key = newKey.trim();
    if (!key) return;
    await togglesModel.create(id, key);
    setNewKey("");
    setShowModal(false);
  };

  const handleCreateEnv = async (e: Event) => {
    e.preventDefault();
    const name = newEnvName.trim();
    if (!name) return;
    const created = await environmentsModel.create(id, name);
    setNewEnvName("");
    if (created) await environmentsModel.fetch(id);
  };

  const syncMetaEditor = (toggleId: string) => {
    const t = togglesModel.toggles.value.find((item) => item.id === toggleId);
    if (!t) {
      closeMeta();
      return;
    }
    const rows = metaToRows(t.meta);
    setMetaRows(rows.length > 0 ? rows : [{ key: "", value: "" }]);
  };

  const handleEnvChange = async (env: Environment) => {
    togglesModel.setActiveEnvironment(env.slug);
    await togglesModel.fetch(id, searchQuery || undefined, env.slug);
    if (editingMetaId) syncMetaEditor(editingMetaId);
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
    const ok = await togglesModel.saveMeta(id, toggleId, rowsToMeta(metaRows));
    if (ok) toast.success("Metadata saved");
  };

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

        {envs.length > 0 && (
          <div class="mb-6 flex flex-wrap items-center justify-end gap-2">
            <label class="flex flex-col gap-1.5 text-sm text-content-tertiary">
              <div class="flex items-center gap-2 justify-between">
                <p>Environment</p>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Manage environments"
                  onClick={() => setShowEnvModal(true)}
                >
                  <IconSettings size={16} stroke={2} />
                </Button>
              </div>
              <Select
                value={activeSlug ?? ""}
                options={envs.map((env) => ({
                  value: env.slug,
                  label: env.name,
                  sublabel: env.slug,
                  ...(env.isDefault ? { badge: "default" } : {}),
                }))}
                onChange={(slug) => {
                  const env = envs.find((item) => item.slug === slug);
                  if (env) handleEnvChange(env);
                }}
                class="min-w-[12rem]"
              />
            </label>
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
                          className={`shrink-0 text-content-faint transition-transform duration-100 ${isOpen ? "rotate-90" : ""
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
                        class={`relative mt-0.5 inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/20 ${t.enabled ? "bg-accent" : "bg-raised-hover"
                          }`}
                      >
                        <span
                          class={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${t.enabled ? "translate-x-5" : "translate-x-1"
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
                        <Button type="button" variant="secondary" size="sm" onClick={closeMeta}>
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

      {showEnvModal && (
        <Modal title="Manage Environments" onClose={() => setShowEnvModal(false)}>
          <div class="flex flex-col gap-4">
            <p class="text-xs text-content-tertiary">
              {envs.length} of 3 environments used on the free plan.
            </p>

            {environmentsModel.error.value && (
              <p class="text-sm text-error-text">{environmentsModel.error.value}</p>
            )}

            <ul class="space-y-2">
              {envs.map((env) => (
                <li
                  key={env.id}
                  class="flex items-center justify-between gap-2 rounded-lg border border-edge px-3 py-2"
                >
                  <div>
                    <p class="text-sm font-medium text-content">{env.name}</p>
                    <p class="text-xs font-mono text-content-faint">{env.slug}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    {env.isDefault ? (
                      <span class="text-xs text-content-faint">Default</span>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => environmentsModel.setDefault(id, env.id)}
                        >
                          Set default
                        </Button>
                        <Button
                          variant="danger-icon"
                          size="sm"
                          aria-label={`Delete ${env.name}`}
                          onClick={() => environmentsModel.remove(id, env.id)}
                        >
                          <IconTrash size={14} stroke={2} />
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <form onSubmit={handleCreateEnv} class="flex gap-2">
              <Input
                type="text"
                value={newEnvName}
                onInput={(e) => setNewEnvName((e.target as HTMLInputElement).value)}
                placeholder="New environment name"
                disabled={environmentsModel.creating.value}
                class="flex-1"
              />
              <Button
                type="submit"
                disabled={environmentsModel.creating.value || !newEnvName.trim()}
              >
                Add
              </Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
