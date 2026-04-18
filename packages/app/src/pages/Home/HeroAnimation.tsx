/** Animated hero illustration — a feature flag being toggled on/off in a loop. */
export function HeroAnimation() {
  return (
    <div
      class="border border-edge rounded-xl bg-surface overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Header bar */}
      <div class="flex items-center gap-2 px-4 py-3 border-b border-edge">
        <span class="h-2.5 w-2.5 rounded-full bg-raised-hover" />
        <span class="h-2.5 w-2.5 rounded-full bg-raised-hover" />
        <span class="h-2.5 w-2.5 rounded-full bg-raised-hover" />
        <span class="ml-3 font-mono text-xs text-content-faint">my-app / flags</span>
      </div>

      <div class="p-6 space-y-6">
        <div class="flex items-center gap-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            class="text-content-faint flex-shrink-0"
          >
            <path
              d="M2 1v12M2 1h8l-2 3 2 3H2"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <span class="font-mono text-xs text-content flex-1 truncate">analytics_dashboard</span>

          {/* Status badges — one for ON, one for OFF, crossfade via animation */}
          <span class="relative inline-flex h-4 items-center">
            <span class="hero-anim-badge-off absolute inset-0 flex items-center">
              <span class="font-mono text-xs text-content-faint">off</span>
            </span>
            <span class="hero-anim-badge-on absolute inset-0 flex items-center">
              <span class="font-mono text-xs text-accent-text">on</span>
            </span>
            {/* spacer to give the parent a fixed width */}
            <span class="font-mono text-xs opacity-0" aria-hidden="true">
              off
            </span>
          </span>

          {/* Toggle pill */}
          <button
            type="button"
            role="switch"
            aria-checked="false"
            aria-label="analytics_dashboard flag"
            class="hero-anim-track relative h-5 w-9 rounded-full flex-shrink-0 cursor-default"
          >
            <span class="hero-anim-thumb absolute top-1 h-3 w-3 rounded-full bg-white shadow-sm" />
          </button>
        </div>

        {/* ── Feature card (animates in when flag turns ON) ── */}
        <div class="hero-anim-card rounded-lg border border-edge bg-page overflow-hidden">
          {/* Card header */}
          <div class="flex items-center gap-2 px-4 py-3 border-b border-edge">
            <span class="h-2 w-2 rounded-full bg-accent" />
            <span class="text-xs font-medium text-content">Analytics Overview</span>
            <span class="ml-auto text-xs text-content-faint font-mono">new</span>
          </div>

          {/* Stats row */}
          <div class="grid grid-cols-3 divide-x divide-edge px-0">
            <div class="px-4 py-4">
              <p class="text-xl font-semibold text-content tabular-nums">2,847</p>
              <p class="text-xs text-content-faint mt-0.5">Requests</p>
            </div>
            <div class="px-4 py-4">
              <p class="text-xl font-semibold text-content tabular-nums">99.4%</p>
              <p class="text-xs text-content-faint mt-0.5">Uptime</p>
            </div>
            <div class="px-4 py-4">
              <p class="text-xl font-semibold text-content tabular-nums">12</p>
              <p class="text-xs text-content-faint mt-0.5">Projects</p>
            </div>
          </div>

          {/* Sparkline */}
          <div class="px-4 pb-4">
            <svg
              viewBox="0 0 240 36"
              preserveAspectRatio="none"
              class="w-full h-9"
              aria-hidden="true"
            >
              {/* Area fill */}
              <path
                d="M0,30 C20,28 40,24 60,20 C80,16 90,26 110,14 C130,8 150,10 170,6 C190,4 210,12 240,8 L240,36 L0,36 Z"
                fill="var(--t-accent)"
                opacity="0.12"
              />
              {/* Line */}
              <path
                d="M0,30 C20,28 40,24 60,20 C80,16 90,26 110,14 C130,8 150,10 170,6 C190,4 210,12 240,8"
                fill="none"
                stroke="var(--t-accent)"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
