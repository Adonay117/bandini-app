type Tone = 'default' | 'positive' | 'negative' | 'warning';

const TONE_VALUE: Record<Tone, string> = {
  default: 'text-ink',
  positive: 'text-positive',
  negative: 'text-negative',
  warning: 'text-warning',
};

interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}

export function StatTile({ label, value, hint, tone = 'default' }: StatTileProps) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-[var(--shadow-card)]">
      <p className="text-[11px] font-medium tracking-wide text-muted-light uppercase">{label}</p>
      <p className={`mt-1 text-xl font-semibold tracking-tight tabular-nums ${TONE_VALUE[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-light">{hint}</p>}
    </div>
  );
}
