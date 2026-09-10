import Link from 'next/link';
import { Eye } from 'lucide-react';
import { EstadoPedido, Pedido } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';

const estadoColor: Record<EstadoPedido, string> = {
  cotizacion: 'bg-surface text-muted',
  confirmado: 'bg-blue-50 text-blue-700',
  en_transito: 'bg-amber-50 text-amber-700',
  entregado: 'bg-purple-50 text-purple-700',
  completado: 'bg-emerald-50 text-emerald-700',
};

export function PedidosTable({ pedidos }: { pedidos: Pedido[] }) {
  if (pedidos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-secondary py-16 text-center">
        <p className="text-sm text-muted-light">No hay pedidos registrados todavía.</p>
      </div>
    );
  }

  return (
    <>
      {/* Móvil: tarjetas */}
      <ul className="flex flex-col gap-3 md:hidden">
        {pedidos.map((p) => (
          <li key={p.id}>
            <Link
              href={`/pedidos/${p.id}`}
              className="block rounded-2xl border border-secondary/70 bg-white p-4 shadow-sm active:bg-surface/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    #{p.numero} {p.cliente_nombre && <span className="font-normal text-muted">· {p.cliente_nombre}</span>}
                  </p>
                  {p.cliente_lugar && <p className="text-xs text-muted-light">{p.cliente_lugar}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${estadoColor[p.estado]}`}>{p.estado}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-secondary/60 pt-3 text-sm">
                <div>
                  <p className="text-xs text-muted-light">Total</p>
                  <p className="font-medium text-ink">{formatCurrency(p.total_pedido)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-light">Abonado</p>
                  <p className="font-medium text-ink">{formatCurrency(p.total_abonado)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-light">Saldo</p>
                  <p className="font-semibold text-ink">{formatCurrency(p.saldo_pendiente)}</p>
                </div>
              </div>
              <div className="mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-t border-secondary/60 pt-3 text-sm font-medium text-primary">
                <Eye size={14} /> Ver detalle
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <div className="hidden overflow-hidden rounded-2xl border border-secondary/70 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-secondary/60">
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">#</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Estado</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Total</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Abonado</th>
              <th className="px-5 py-3 text-xs font-medium tracking-wide text-muted-light uppercase">Saldo</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id} className="border-b border-secondary/60 last:border-0 hover:bg-surface/60">
                <td className="px-5 py-3 font-medium text-ink">#{p.numero}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${estadoColor[p.estado]}`}>{p.estado}</span>
                </td>
                <td className="px-5 py-3 text-muted">{formatCurrency(p.total_pedido)}</td>
                <td className="px-5 py-3 text-muted">{formatCurrency(p.total_abonado)}</td>
                <td className="px-5 py-3 font-medium text-ink">{formatCurrency(p.saldo_pendiente)}</td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/pedidos/${p.id}`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
                  >
                    <Eye size={14} /> Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
