import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PedidoProgress } from '@/components/pedidos/PedidoProgress';
import { Pedido } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { ESTADO_PEDIDO } from '@/lib/utils/pedidos';

export function PedidosTable({ pedidos }: { pedidos: Pedido[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {pedidos.map((p) => {
        const est = ESTADO_PEDIDO[p.estado];
        return (
          <li key={p.id}>
            <Link
              href={`/pedidos/${p.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-3 shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-px hover:border-primary/25 hover:shadow-[var(--shadow-card-hover)] sm:px-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink tabular-nums">#{p.numero}</span>
                  <Badge variant={est.badge}>{est.label}</Badge>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-light">
                  {p.cliente_nombre ?? 'Sin cliente'}
                  {p.cliente_lugar && ` · ${p.cliente_lugar}`}
                </p>
                <PedidoProgress
                  className="mt-2 max-w-56"
                  total={p.total_pedido}
                  abonado={p.total_abonado}
                  saldo={p.saldo_pendiente}
                />
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-ink tabular-nums">{formatCurrency(p.total_pedido)}</p>
                <p className="hidden text-[11px] text-muted-light sm:block">total</p>
              </div>

              <ChevronRight size={16} className="shrink-0 text-muted-light" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
