import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';

type Tone = 'default' | 'positive' | 'negative' | 'warning';

const TONE_ICON: Record<Tone, string> = {
  default: 'bg-secondary/50 text-primary',
  positive: 'bg-positive-surface text-positive',
  negative: 'bg-negative-surface text-negative',
  warning: 'bg-warning-surface text-warning',
};

const TONE_VALUE: Record<Tone, string> = {
  default: 'text-ink',
  positive: 'text-ink',
  negative: 'text-negative',
  warning: 'text-warning',
};

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: Tone;
  /** Variación relativa vs. el período anterior (0.12 = +12 %). */
  delta?: number | null;
  href?: string;
}

export function MetricCard({ label, value, icon: Icon, hint, tone = 'default', delta, href }: MetricCardProps) {
  const sinCambio = delta == null || !isFinite(delta) || Math.round(delta * 100) === 0;
  const sube = (delta ?? 0) > 0;

  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-light uppercase">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_ICON[tone]}`}>
          <Icon size={15} strokeWidth={2.2} />
        </span>
      </div>

      <p className={`mt-3 text-[26px] leading-none font-semibold tracking-tight tabular-nums sm:text-[28px] ${TONE_VALUE[tone]}`}>
        {value}
      </p>

      <div className="mt-2.5 flex items-center gap-2">
        {!sinCambio && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
              sube ? 'bg-positive-surface text-positive' : 'bg-negative-surface text-negative'
            }`}
          >
            {sube ? <TrendingUp size={11} strokeWidth={2.5} /> : <TrendingDown size={11} strokeWidth={2.5} />}
            {sube ? '+' : '−'}
            {Math.abs(Math.round((delta ?? 0) * 100))}%
          </span>
        )}
        {hint && <p className="truncate text-xs text-muted-light">{hint}</p>}
      </div>
    </>
  );

  const base =
    'block rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-150';

  if (href) {
    return (
      <Link
        href={href}
        className={`${base} hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-card-hover)]`}
      >
        {contenido}
      </Link>
    );
  }

  return <div className={base}>{contenido}</div>;
}
