import { ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'positive' | 'negative' | 'warning' | 'primary';

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'bg-surface text-muted',
  positive: 'bg-positive-surface text-positive',
  negative: 'bg-negative-surface text-negative',
  warning: 'bg-warning-surface text-warning',
  primary: 'bg-secondary/60 text-primary',
};

export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
