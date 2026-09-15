/** Compact number formatting for quotas (e.g. 250000 → "250k", 5000000 → "5M"). */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? m : parseFloat(m.toFixed(1))}M`;
  }
  if (abs >= 1_000) {
    const k = n / 1_000;
    return `${Number.isInteger(k) ? k : parseFloat(k.toFixed(1))}k`;
  }
  return String(n);
}
