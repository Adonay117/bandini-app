'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PedidoProgress } from '@/components/pedidos/PedidoProgress';
import { PopConfirm, PopConfirmRequest } from '@/components/ui/PopConfirm';
import { EstadoPedido, Pedido } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { ESTADOS_PEDIDO, ESTADO_PEDIDO, evaluarCambioEstado } from '@/lib/utils/pedidos';

interface Props {
  pedidos: Pedido[];
  onCambiarEstado?: (id: string, estado: EstadoPedido) => Promise<void> | void;
}

export function PedidosTable({ pedidos, onCambiarEstado }: Props) {
  const [cambiandoId, setCambiandoId] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<PopConfirmRequest | null>(null);

  async function aplicarCambio(p: Pedido, estado: EstadoPedido) {
    setCambiandoId(p.id);
    try {
      await onCambiarEstado?.(p.id, estado);
    } finally {
      setCambiandoId(null);
    }
  }

  function handleChange(p: Pedido, estado: EstadoPedido, select: HTMLSelectElement) {
    if (!onCambiarEstado || estado === p.estado) return;
    const { requiereConfirmacion, mensaje } = evaluarCambioEstado(p.estado, estado);
    if (!requiereConfirmacion) {
      aplicarCambio(p, estado);
      return;
    }
    setPendiente({ anchor: select, message: mensaje, onConfirm: () => aplicarCambio(p, estado) });
  }

  return (
    <>
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
                    {onCambiarEstado ? (
                      <span className="inline-flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                        <select
                          value={p.estado}
                          disabled={cambiandoId === p.id}
                          onChange={(e) => handleChange(p, e.target.value as EstadoPedido, e.currentTarget)}
                          aria-label={`Cambiar estado del pedido #${p.numero}`}
                          className="rounded-md border border-border bg-white px-1.5 py-0.5 text-[11px] font-semibold text-ink outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {ESTADOS_PEDIDO.map((e) => (
                            <option key={e} value={e}>
                              {ESTADO_PEDIDO[e].label}
                            </option>
                          ))}
                        </select>
                        {cambiandoId === p.id && <Loader2 size={12} className="animate-spin text-muted-light" />}
                      </span>
                    ) : (
                      <Badge variant={est.badge}>{est.label}</Badge>
                    )}
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
      <PopConfirm request={pendiente} onClose={() => setPendiente(null)} />
    </>
  );
}
