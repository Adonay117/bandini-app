'use client';

import { useMemo } from 'react';
import { Producto, Venta } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { estaEnMes, formatMesLargo } from '@/lib/utils/charts';

export function TopProductosChart({
  ventas,
  productos,
  mes,
}: {
  ventas: Venta[];
  productos: Producto[];
  mes: string;
}) {
  const data = useMemo(() => {
    const acumulado = new Map<string, { cantidad: number; total: number }>();

    for (const v of ventas) {
      if (!estaEnMes(v.fecha, mes)) continue;
      const actual = acumulado.get(v.producto_id) ?? { cantidad: 0, total: 0 };
      actual.cantidad += v.cantidad;
      actual.total += v.total;
      acumulado.set(v.producto_id, actual);
    }

    return Array.from(acumulado.entries())
      .map(([productoId, valores]) => ({
        nombre: productos.find((p) => p.id === productoId)?.nombre ?? 'Producto eliminado',
        ...valores,
      }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [ventas, productos, mes]);

  const max = Math.max(...data.map((d) => d.cantidad), 1);

  return (
    <div className="rounded-2xl border border-secondary/70 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="text-xs font-medium tracking-wide text-muted-light uppercase">Top 5 productos más vendidos</h3>
        <p className="mt-1 text-sm text-muted">{formatMesLargo(mes)}</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-secondary py-14">
          <p className="text-sm text-muted-light">Sin ventas en este mes.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {data.map((item, i) => (
            <li key={item.nombre} className="flex items-center gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  i === 0 ? 'bg-primary text-white' : 'bg-surface text-muted'
                }`}
              >
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{item.nombre}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                    {item.cantidad} <span className="text-xs font-normal text-muted-light">uds</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max((item.cantidad / max) * 100, 4)}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-light">{formatCurrency(item.total)} generados</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
