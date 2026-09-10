export function StatPill({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-surface px-3.5 py-2.5">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div>
        <div className="text-[11px] leading-none text-muted-light">{label}</div>
        <div className="mt-1 text-sm leading-none font-semibold tabular-nums text-ink">{value}</div>
      </div>
    </div>
  );
}
