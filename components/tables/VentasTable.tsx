import { Venta } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';

export function VentasTable({ ventas }: { ventas: Venta[] }) {
  if (ventas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-secondary py-16 text-center">
        <p className="text-sm text-muted-light">No hay ventas registradas todavía.</p>
      </div>
    );
  }

  return (
    <>
      {/* Móvil: tarjetas */}
      <ul className="flex flex-col gap-3 md:hidden">
        {ventas.map((v) => (
          <li key={v.id} className="rounded-2xl border border-secondary/70 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{v.producto_nombre ?? 'Producto eliminado'}</p>
                <p className="truncate text-sm text-muted-light">{v.cliente_nombre ?? 'Sin cliente'}</p>
              </div>
              <p className="shrink-0 font-semibold text-ink">{formatCurrency(v.total)}</p>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-secondary/60 pt-3 text-xs text-muted-light">
              <span>{formatDateTime(v.fecha)}</span>
              <span>
                {v.cantidad} × {formatCurrency(v.precio_unitario)}
                {v.descuento > 0 && <span> · −{formatCurrency(v.descuento)}</span>}
              </span>
              <span className="capitalize">{v.metodo_pago ?? '—'}</span>
            </div>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-hidden rounded-2xl border border-secondary/70 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-secondary/60">
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Fecha</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Cliente</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Producto</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Cantidad</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Precio unit.</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Descuento</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Total</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Pago</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id} className="border-b border-secondary/60 last:border-0 hover:bg-surface/60">
                <td className="px-5 py-3 text-muted">{formatDateTime(v.fecha)}</td>
                <td className="px-5 py-3 text-ink">{v.cliente_nombre ?? '—'}</td>
                <td className="px-5 py-3 text-ink">{v.producto_nombre ?? '—'}</td>
                <td className="px-5 py-3 text-muted">{v.cantidad}</td>
                <td className="px-5 py-3 text-muted">{formatCurrency(v.precio_unitario)}</td>
                <td className="px-5 py-3 text-muted">{v.descuento > 0 ? formatCurrency(v.descuento) : '—'}</td>
                <td className="px-5 py-3 font-medium text-ink">{formatCurrency(v.total)}</td>
                <td className="px-5 py-3 capitalize text-muted">{v.metodo_pago ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
