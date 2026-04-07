interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
}

export function StatCard({ label, value, sub, accent, warn }: StatCardProps) {
  return (
    <div class="bg-surface border border-edge rounded-xl p-4 flex flex-col gap-1">
      <p class="text-xs text-content-tertiary font-medium uppercase tracking-wide">{label}</p>
      <p
        class={`text-2xl font-bold ${accent ? "text-accent-text" : warn ? "text-error-text" : "text-content"}`}
      >
        {value}
      </p>
      {sub && <p class="text-xs text-content-faint">{sub}</p>}
    </div>
  );
}
