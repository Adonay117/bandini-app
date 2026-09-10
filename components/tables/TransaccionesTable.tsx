import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Transaccion } from '@/lib/types';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';

const categoriaLabel: Record<string, string> = {
  venta: 'Venta',
  abono_pedido: 'Abono de pedido',
  premio_sticker: 'Premio de sticker',
};

export function TransaccionesTable({ transacciones }: { transacciones: Transaccion[] }) {
  if (transacciones.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-secondary py-16 text-center">
        <p className="text-sm text-muted-light">No hay transacciones registradas todavía.</p>
      </div>
    );
  }

  return (
    <>
      {/* Móvil: tarjetas */}
      <ul className="flex flex-col gap-3 md:hidden">
        {transacciones.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-secondary/70 bg-white p-4 shadow-sm">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                t.tipo === 'ingreso' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}
            >
              {t.tipo === 'ingreso' ? <ArrowUpCircle size={17} /> : <ArrowDownCircle size={17} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{categoriaLabel[t.categoria] ?? t.categoria ?? '—'}</p>
              <p className="text-xs text-muted-light">{formatDateTime(t.fecha)}</p>
            </div>
            <p className={`shrink-0 font-semibold ${t.tipo === 'ingreso' ? 'text-emerald-700' : 'text-red-700'}`}>
              {t.tipo === 'ingreso' ? '+' : '−'} {formatCurrency(t.monto)}
            </p>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-hidden rounded-2xl border border-secondary/70 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-secondary/60">
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Tipo</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Categoría</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Fecha</th>
              <th className="px-5 py-3 text-right text-xs font-medium tracking-wide text-muted-light uppercase">Monto</th>
            </tr>
          </thead>
          <tbody>
            {transacciones.map((t) => (
              <tr key={t.id} className="border-b border-secondary/60 last:border-0 hover:bg-surface/60">
                <td className="px-5 py-3">
                  {t.tipo === 'ingreso' ? (
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <ArrowUpCircle size={15} /> Ingreso
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-600">
                      <ArrowDownCircle size={15} /> Egreso
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-muted">{categoriaLabel[t.categoria] ?? t.categoria ?? '—'}</td>
                <td className="px-5 py-3 text-muted-light">{formatDateTime(t.fecha)}</td>
                <td className={`px-5 py-3 text-right font-medium ${t.tipo === 'ingreso' ? 'text-emerald-700' : 'text-red-700'}`}>
                  {t.tipo === 'ingreso' ? '+' : '−'} {formatCurrency(t.monto)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
