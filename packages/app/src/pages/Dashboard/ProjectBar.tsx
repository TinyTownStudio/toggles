import type { DashboardProjectEntry } from "../../lib/api";

interface ProjectBarProps {
  entry: DashboardProjectEntry;
  max: number;
  onNavigate: (projectId: string) => void;
}

export function ProjectBar({ entry, max, onNavigate }: ProjectBarProps) {
  const pct = max === 0 ? 0 : Math.round((entry.totalFlags / max) * 100);
  return (
    <li>
      <button
        type="button"
        class="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-raised cursor-pointer transition-colors text-left"
        onClick={() => onNavigate(entry.projectId)}
      >
        <span class="text-sm text-content-secondary w-32 truncate shrink-0">
          {entry.projectName}
        </span>
        <div class="flex-1 h-2 bg-raised rounded-full overflow-hidden">
          <div class="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span class="text-xs text-content-faint w-16 text-right shrink-0">
          {entry.enabledFlags}/{entry.totalFlags} on
        </span>
      </button>
    </li>
  );
}
