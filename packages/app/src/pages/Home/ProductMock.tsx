const FLAGS = [
  {
    key: "new-checkout",
    enabled: true,
    meta: [
      { key: "rollout", value: "internal" },
      { key: "owner", value: "payments" },
    ],
  },
  {
    key: "dark-mode",
    enabled: true,
    meta: [] as { key: string; value: string }[],
  },
  {
    key: "ai-summaries",
    enabled: false,
    meta: [{ key: "experiment", value: "b" }],
  },
  {
    key: "legacy-billing",
    enabled: false,
    meta: [] as { key: string; value: string }[],
  },
] as const;

export function ProductMock() {
  return (
    <div
      class="pointer-events-none select-none rounded-xl border border-edge bg-surface shadow-lg overflow-hidden"
      aria-hidden="true"
    >
      {/* Browser chrome */}
      <div class="flex items-center gap-2 border-b border-edge bg-raised px-3 py-2.5">
        <div class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-content-faint/40" />
          <span class="size-2 rounded-full bg-content-faint/40" />
          <span class="size-2 rounded-full bg-content-faint/40" />
        </div>
        <div class="ml-2 flex-1 truncate rounded-md bg-page px-2.5 py-1 font-mono text-[11px] text-content-faint">
          toggles.app/app/projects/checkout
        </div>
      </div>

      {/* App content */}
      <div class="bg-page px-4 py-5 sm:px-5">
        <p class="mb-1 text-[11px] text-content-tertiary">← Projects</p>
        <h3 class="mb-4 text-lg font-bold tracking-tight text-content">checkout</h3>

        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          {/* Env select mock - Staging selected */}
          <div class="flex min-w-[9rem] items-center justify-between gap-2 rounded-lg border border-edge bg-surface px-2.5 py-1.5">
            <div class="min-w-0">
              <p class="truncate text-xs font-medium text-content">Staging</p>
              <p class="truncate text-[10px] text-content-faint">staging</p>
            </div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              class="shrink-0 text-content-faint"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <div class="flex items-center gap-2">
            <div class="hidden w-36 rounded-lg border border-edge bg-surface px-2.5 py-1.5 text-xs text-content-faint sm:block">
              Search…
            </div>
            <div class="rounded-lg bg-cta px-3 py-1.5 text-xs font-medium text-cta-text">
              New Flag
            </div>
          </div>
        </div>

        <ul class="space-y-2">
          {FLAGS.map((flag) => (
            <li key={flag.key} class="rounded-lg border border-edge bg-page px-3 py-2.5">
              <div class="flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      class="shrink-0 text-content-faint"
                    >
                      <path
                        d="M4.5 2.5L8 6L4.5 9.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <span class="truncate font-mono text-xs text-content sm:text-sm">{flag.key}</span>
                  </div>
                  <div class="mt-1 ml-[18px] flex flex-wrap items-center gap-1">
                    {flag.meta.length > 0 ? (
                      flag.meta.map((m) => (
                        <span
                          key={m.key}
                          class="inline-flex items-center gap-1 rounded-md bg-raised px-1.5 py-0.5 text-[10px] text-content-tertiary"
                        >
                          <span class="font-mono">{m.key}</span>
                          <span class="text-content-faint">=</span>
                          <span>{m.value}</span>
                        </span>
                      ))
                    ) : (
                      <span class="text-[10px] text-content-faint">Add metadata…</span>
                    )}
                  </div>
                </div>
                <div
                  class={`relative mt-0.5 inline-flex h-4 w-7 shrink-0 items-center rounded-full ${
                    flag.enabled ? "bg-accent" : "bg-raised-hover"
                  }`}
                >
                  <span
                    class={`inline-block h-2.5 w-2.5 rounded-full bg-white ${
                      flag.enabled ? "translate-x-3.5" : "translate-x-0.5"
                    }`}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
