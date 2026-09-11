import Link from 'next/link';
import { MetodoPagoBadge } from '@/components/ui/MetodoPagoBadge';
import { Venta } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';

export function VentasTable({ ventas }: { ventas: Venta[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {ventas.map((v) => (
        <li
          key={v.id}
          className="flex items-start gap-3 rounded-xl border border-border bg-white px-3 py-3 shadow-[var(--shadow-card)] sm:px-4"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{v.producto_nombre ?? 'Producto eliminado'}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-light">
              {v.cliente_id && v.cliente_nombre ? (
                <Link href={`/clientes/${v.cliente_id}`} className="font-medium text-primary hover:underline">
                  {v.cliente_nombre}
                </Link>
              ) : (
                <span>{v.cliente_nombre ?? 'Sin cliente'}</span>
              )}
              <span aria-hidden>·</span>
              <MetodoPagoBadge metodo={v.metodo_pago} />
            </p>
            <p className="mt-1 text-xs text-muted-light">{formatDateTime(v.fecha)}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-ink tabular-nums">{formatCurrency(v.total)}</p>
            <p className="text-[11px] text-muted-light tabular-nums">
              {v.cantidad} × {formatCurrency(v.precio_unitario)}
            </p>
            {v.descuento > 0 && (
              <p className="text-[11px] text-warning tabular-nums">−{formatCurrency(v.descuento)} desc.</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
