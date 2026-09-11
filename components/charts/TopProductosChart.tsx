'use client';

import { ChartCard } from '@/components/dashboard/ChartCard';
import { ProductoTop } from '@/lib/hooks/useDashboard';
import { formatCurrency } from '@/lib/utils/formatters';

interface Props {
  data: ProductoTop[];
  mesLabel: string;
}

export function TopProductosChart({ data, mesLabel }: Props) {
  const max = Math.max(...data.map((d) => d.cantidad), 1);

  return (
    <ChartCard title="Productos más vendidos" subtitle={mesLabel}>
      {data.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-light">Sin ventas en este mes.</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3.5">
          {data.map((item, i) => (
            <li key={item.nombre} className="flex items-start gap-3">
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface text-[11px] font-semibold text-muted tabular-nums">
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{item.nombre}</span>
                  <span className="shrink-0 text-sm font-semibold text-ink tabular-nums">
                    {item.cantidad}
                    <span className="ml-0.5 text-xs font-normal text-muted-light">uds</span>
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max((item.cantidad / max) * 100, 3)}%`,
                        background:
                          i === 0
                            ? 'linear-gradient(90deg, #3f365b, #6b5da8)'
                            : 'linear-gradient(90deg, #8b7fc0, #b7addc)',
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-xs text-muted-light tabular-nums">{formatCurrency(item.total)}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ChartCard>
  );
}
