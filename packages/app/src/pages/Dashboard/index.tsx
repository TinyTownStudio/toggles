import { useEffect } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useModel } from "@preact/signals";
import { AuthModel } from "../../models/auth";
import { DashboardModel } from "../../models/dashboard";
import { StatCard } from "./StatCard";
import { ApiKeyCard } from "./ApiKeyCard";
import { QuotaBar } from "./QuotaBar";
import { FlagRow } from "./FlagRow";
import { ProjectBar } from "./ProjectBar";

// ── Main component ────────────────────────────────────────────────────────────

export function Dashboard() {
  const { route } = useLocation();
  const auth = useModel(AuthModel);
  const dash = useModel(DashboardModel);

  useEffect(() => {
    auth.checkSession().then(() => {
      if (!auth.authenticated.value) {
        route("/auth");
        return;
      }
      dash.fetch();
    });
  }, []);

  const navigateToProject = (projectId: string) => {
    route(`/app/projects/${projectId}`);
  };

  if (auth.loading.value || dash.loading.value) {
    return (
      <div class="min-h-screen bg-page pt-16 flex items-center justify-center">
        <p class="text-content-tertiary text-sm">Loading...</p>
      </div>
    );
  }

  const s = dash.stats.value;

  if (!s) {
    return (
      <div class="min-h-screen bg-page pt-16 flex items-center justify-center">
        <p class="text-error-text text-sm">{dash.error.value ?? "Failed to load dashboard."}</p>
      </div>
    );
  }

  const maxFlagsInProject = Math.max(...s.flagsPerProject.map((p) => p.totalFlags), 1);

  // Plan limits — may be Infinity or missing keys depending on plan
  const projectLimit =
    "product" in s.beta && s.beta.product
      ? Infinity
      : typeof (s.limits as Record<string, unknown>).projects === "number" &&
          isFinite((s.limits as Record<string, unknown>).projects as number)
        ? ((s.limits as Record<string, unknown>).projects as number)
        : null;

  const apiKeyAttentionCount = s.unusedApiKeys + s.expiringApiKeys;

  return (
    <div class="min-h-screen bg-page pt-16">
      <div class="max-w-5xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold tracking-tight text-content">Dashboard</h1>
          {dash.error.value && <p class="text-sm text-error-text">{dash.error.value}</p>}
        </div>

        {/* ── Row 1: KPI cards ─────────────────────────────────── */}
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Projects" value={s.totalProjects} />
          <StatCard label="Total Flags" value={s.totalFlags} />
          <StatCard
            label="Enabled"
            value={s.enabledFlags}
            sub={
              s.totalFlags > 0 ? `${Math.round((s.enabledFlags / s.totalFlags) * 100)}%` : undefined
            }
            accent
          />
          <StatCard
            label="Disabled"
            value={s.disabledFlags}
            sub={
              s.totalFlags > 0
                ? `${Math.round((s.disabledFlags / s.totalFlags) * 100)}%`
                : undefined
            }
          />
          <ApiKeyCard
            active={s.activeApiKeys}
            total={s.totalApiKeys}
            attentionCount={apiKeyAttentionCount}
          />
        </div>

        {/* ── Row 2: Plan quota ─────────────────────────────────── */}
        <div class="bg-surface border border-edge rounded-xl p-5">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-semibold text-content">Plan Usage</h2>
            <span class="text-xs font-medium bg-accent-surface text-accent-text px-2 py-0.5 rounded-full capitalize">
              {s.plan}
            </span>
          </div>
          <div class="divide-y divide-edge">
            <QuotaBar label="Projects" used={s.totalProjects} limit={projectLimit} />
            <QuotaBar label="Feature Flags" used={s.totalFlags} limit={null} />
          </div>
        </div>

        {/* ── Row 3: Recently modified + Stale flags ────────────── */}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recently modified */}
          <div class="bg-surface border border-edge rounded-xl p-5">
            <h2 class="text-sm font-semibold text-content mb-3">Recently Modified</h2>
            {s.recentlyModified.length === 0 ? (
              <p class="text-sm text-content-faint py-4 text-center">No flags yet.</p>
            ) : (
              <ul class="-mx-1">
                {s.recentlyModified.map((flag) => (
                  <FlagRow key={flag.id} flag={flag} onNavigate={navigateToProject} />
                ))}
              </ul>
            )}
          </div>

          {/* Stale flags */}
          <div class="bg-surface border border-edge rounded-xl p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-semibold text-content">Stale Flags</h2>
              {s.staleFlags.length > 0 && (
                <span class="text-xs font-medium bg-error-surface text-error-text px-2 py-0.5 rounded-full border border-error-edge">
                  {s.staleFlags.length} flag{s.staleFlags.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {s.staleFlags.length === 0 ? (
              <p class="text-sm text-content-faint py-4 text-center">
                No flags untouched for 30+ days.
              </p>
            ) : (
              <ul class="-mx-1">
                {s.staleFlags.slice(0, 5).map((flag) => (
                  <FlagRow key={flag.id} flag={flag} onNavigate={navigateToProject} />
                ))}
                {s.staleFlags.length > 5 && (
                  <li class="py-2 px-3 text-xs text-content-faint">
                    + {s.staleFlags.length - 5} more stale flags
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* ── Row 4: Flags per project ──────────────────────────── */}
        {s.flagsPerProject.length > 0 && (
          <div class="bg-surface border border-edge rounded-xl p-5">
            <h2 class="text-sm font-semibold text-content mb-3">Flags per Project</h2>
            <ul class="-mx-1">
              {s.flagsPerProject
                .slice()
                .sort((a, b) => b.totalFlags - a.totalFlags)
                .map((entry) => (
                  <ProjectBar
                    key={entry.projectId}
                    entry={entry}
                    max={maxFlagsInProject}
                    onNavigate={navigateToProject}
                  />
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
