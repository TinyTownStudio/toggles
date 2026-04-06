import type { DashboardFlagEntry } from "../../lib/api";
import { formatRelativeTime } from "../../lib/date";

interface FlagRowProps {
  flag: DashboardFlagEntry;
  onNavigate: (projectId: string) => void;
}

export function FlagRow({ flag, onNavigate }: FlagRowProps) {
  return (
    <li>
      <button
        type="button"
        class="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-raised cursor-pointer transition-colors text-left"
        onClick={() => onNavigate(flag.projectId)}
      >
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-content font-mono truncate">{flag.key}</p>
          <p class="text-xs text-content-faint">{flag.projectName}</p>
        </div>
        <div class="flex items-center gap-3 ml-4 shrink-0">
          <span
            class={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
              flag.enabled
                ? "bg-success-surface text-success-text"
                : "bg-surface text-content-faint border border-edge"
            }`}
          >
            {flag.enabled ? "on" : "off"}
          </span>
          <span class="text-xs text-content-faint">{formatRelativeTime(flag.updatedAt)}</span>
        </div>
      </button>
    </li>
  );
}
