import { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Contenido a la derecha del encabezado: leyenda, píldoras de totales, etc. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, actions, children, className = '' }: ChartCardProps) {
  return (
    <section
      className={`flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] sm:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-light">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}
