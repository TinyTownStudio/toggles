interface QuotaBarProps {
  label: string;
  used: number;
  limit: number | null;
}

export function QuotaBar({ label, used, limit }: QuotaBarProps) {
  if (limit === null) {
    return (
      <div class="flex items-center justify-between py-2">
        <span class="text-sm text-content-secondary">{label}</span>
        <span class="text-sm font-medium text-content">
          {used} <span class="text-content-faint font-normal">/ unlimited</span>
        </span>
      </div>
    );
  }
  const pct = limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  const isNearLimit = pct >= 80;
  return (
    <div class="py-2">
      <div class="flex items-center justify-between mb-1.5">
        <span class="text-sm text-content-secondary">{label}</span>
        <span class="text-sm font-medium text-content">
          {used} <span class="text-content-faint font-normal">/ {limit}</span>
        </span>
      </div>
      <div class="h-1.5 bg-raised rounded-full overflow-hidden">
        <div
          class={`h-full rounded-full transition-all ${isNearLimit ? "bg-error-text" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
