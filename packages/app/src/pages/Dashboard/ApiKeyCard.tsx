interface ApiKeyCardProps {
  active: number;
  total: number;
  attentionCount: number;
}

export function ApiKeyCard({ active, total, attentionCount }: ApiKeyCardProps) {
  const healthy = attentionCount === 0;
  return (
    <div class="bg-surface border border-edge rounded-xl p-4 flex flex-col gap-2 lg:col-span-2">
      <p class="text-xs text-content-tertiary font-medium uppercase tracking-wide">API Keys</p>
      <div class="flex items-stretch gap-4">
        <div class="flex-1 flex flex-col gap-0.5">
          <p class="text-2xl font-bold text-content">{active}</p>
          <p class="text-xs text-content-faint">{total} total</p>
        </div>
        <div class="w-px bg-edge shrink-0" />
        <div class="flex-1 flex flex-col gap-0.5">
          <p class={`text-2xl font-bold ${healthy ? "text-success-text" : "text-error-text"}`}>
            {attentionCount}
          </p>
          <p class="text-xs text-content-faint">
            {healthy ? "all keys healthy" : "unused or expiring"}
          </p>
        </div>
      </div>
    </div>
  );
}
