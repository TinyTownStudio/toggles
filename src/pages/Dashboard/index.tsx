import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { AuthModel } from "../../models/auth";
import { NotesModel } from "../../models/notes";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

export function Dashboard() {
  const { route } = useLocation();
  const auth = useModel(AuthModel);
  const notes = useModel(NotesModel);

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
      }
    });
  }, []);

  if (auth.loading.value) {
    return (
      <div class="min-h-screen bg-page pt-16 flex items-center justify-center">
        <p class="text-content-tertiary text-sm">Loading...</p>
      </div>
    );
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    notes.add();
  }

  return (
    <div class="min-h-screen bg-page pt-16">
      <div class="max-w-4xl mx-auto px-6 py-12">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-bold text-content">Dashboard</h1>
          <Button variant="ghost" size="sm" onClick={() => route("/billing")}>
            Billing
          </Button>
        </div>

        {/* Notes — example interaction */}
        <div class="bg-surface border border-edge rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-content">Notes</h2>
            <span class="text-xs text-content-faint">{notes.count.value} items</span>
          </div>

          <form onSubmit={handleSubmit} class="flex gap-2 mb-4">
            <Input
              type="text"
              placeholder="Write a note..."
              value={notes.draft.value}
              onInput={(e) => (notes.draft.value = (e.target as HTMLInputElement).value)}
              class="flex-1"
            />
            <Button type="submit" disabled={!notes.draft.value.trim()}>
              Add
            </Button>
          </form>

          {notes.items.value.length === 0 ? (
            <p class="text-sm text-content-faint text-center py-8">No notes yet. Add one above.</p>
          ) : (
            <ul class="space-y-2">
              {notes.items.value.map((note) => (
                <li
                  key={note.id}
                  class="flex items-center justify-between bg-note-bg rounded-lg px-4 py-3 group"
                >
                  <span class="text-sm text-content-secondary">{note.text}</span>
                  <button
                    onClick={() => notes.remove(note.id)}
                    class="text-delete hover:text-delete-hover transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete note"
                  >
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width={2}
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
