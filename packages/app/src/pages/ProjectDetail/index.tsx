import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { useEffect, useState } from "preact/hooks";
import { AuthModel } from "../../models/auth";
import { ProjectsModel } from "../../models/projects";
import { TogglesModel } from "../../models/toggles";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
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
  const { route } = useLocation();
  const [newKey, setNewKey] = useState("");
  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [metaRows, setMetaRows] = useState<MetaRow[]>([]);

  useEffect(() => {
    auth.checkSession().then(async () => {
      if (!auth.authenticated.value) {
        route("/auth");
        return;
      }
      await Promise.all([
        projectsModel.projects.value.length === 0 ? projectsModel.fetch() : Promise.resolve(),
        togglesModel.fetch(id),
      ]);
    });
  }, [id]);

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

  return (
    <div class="min-h-screen bg-page pt-16">
      <div class="max-w-4xl mx-auto px-6 py-12">
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
