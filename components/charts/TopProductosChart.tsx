import Link from 'next/link';
import { Crown } from 'lucide-react';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { ProductoThumb } from '@/components/productos/ProductoThumb';
import { ProductoTop } from '@/lib/hooks/useDashboard';
import { formatCurrency } from '@/lib/utils/formatters';

interface Props {
  data: ProductoTop[];
  mesLabel: string;
}

export function TopProductosChart({ data, mesLabel }: Props) {
  return (
    <ChartCard title="Productos más vendidos" subtitle={mesLabel}>
      {data.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-light">Sin ventas en este mes.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {data.map((item, i) => {
            const esPrimero = i === 0;
            const fila = (
              <>
                {esPrimero ? (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning text-white">
                    <Crown size={14} strokeWidth={2.5} fill="currentColor" />
                  </span>
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface text-[11px] font-semibold text-muted tabular-nums">
                    {i + 1}
                  </span>
                )}
                <ProductoThumb src={item.imagen_url} size={esPrimero ? 52 : 44} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-ink ${esPrimero ? 'text-[15px] font-semibold' : 'text-sm font-medium'}`}>
                    {item.nombre}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-light">
                    {item.cantidad} unidad{item.cantidad === 1 ? '' : 'es'} vendida{item.cantidad === 1 ? '' : 's'}
                  </p>
                </div>
                <span className={`shrink-0 tabular-nums text-ink ${esPrimero ? 'text-base font-semibold' : 'text-sm font-semibold'}`}>
                  {formatCurrency(item.total)}
                </span>
              </>
            );
            const claseFila = `flex items-center gap-3 rounded-xl transition-colors ${
              esPrimero
                ? 'border border-warning/25 bg-warning-surface/60 px-2.5 py-2.5'
                : 'px-1 py-1.5 hover:bg-surface/60'
            }`;
            return (
              <li key={item.producto_id ?? item.nombre}>
                {item.producto_id ? (
                  <Link href={`/productos/${item.producto_id}`} className={claseFila}>
                    {fila}
                  </Link>
                ) : (
                  <div className={claseFila}>{fila}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
