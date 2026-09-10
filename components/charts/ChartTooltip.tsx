'use client';

import { TooltipContentProps } from 'recharts';
import { formatCurrency } from '@/lib/utils/formatters';

export function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg bg-primary px-3 py-2 text-xs text-white shadow-lg">
      {label != null && <div className="mb-1.5 font-medium text-secondary">{label}</div>}
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={entry.dataKey as string} className="flex items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-secondary">{entry.name}</span>
            <span className="ml-auto pl-2 font-medium tabular-nums">{formatCurrency(Number(entry.value))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
