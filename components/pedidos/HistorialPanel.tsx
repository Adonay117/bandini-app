'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { HistorialEstado } from '@/lib/types';
import { formatDateTime } from '@/lib/utils/formatters';
import { ESTADO_ITEM, ESTADO_PEDIDO } from '@/lib/utils/pedidos';
import {
  ESTADO_DEVOLUCION,
  ESTADO_ENTREGA,
  ESTADO_INCIDENCIA,
  ESTADO_REPOSICION,
} from '@/lib/utils/logistica';

const ENTIDAD: Record<string, { nombre: string; etiquetas: Record<string, { label: string }> }> = {
  pedidos: { nombre: 'Pedido', etiquetas: ESTADO_PEDIDO },
  pedido_items: { nombre: 'Producto', etiquetas: ESTADO_ITEM },
  incidencias: { nombre: 'Incidencia', etiquetas: ESTADO_INCIDENCIA },
  devoluciones: { nombre: 'Devolución', etiquetas: ESTADO_DEVOLUCION },
  reposiciones: { nombre: 'Reposición', etiquetas: ESTADO_REPOSICION },
  entregas: { nombre: 'Entrega', etiquetas: ESTADO_ENTREGA },
};

const VISIBLES = 8;

// Línea de tiempo de todos los cambios de estado del pedido y de lo que
// cuelga de él (se registra por trigger en historial_estados).
export function HistorialPanel({ historial, nombres }: { historial: HistorialEstado[]; nombres: Map<string, string> }) {
  const [todo, setTodo] = useState(false);
  if (historial.length === 0) return null;
  const lista = todo ? historial : historial.slice(0, VISIBLES);

  return (
    <Panel title="Historial">
      <ol className="flex flex-col gap-2 border-l-2 border-border pl-4 text-xs">
        {lista.map((h) => {
          const ent = ENTIDAD[h.entidad];
          const etiqueta = (e: string | null) => (e ? (ent?.etiquetas[e]?.label ?? e) : null);
          const sujeto = h.entidad === 'pedido_items' ? nombres.get(h.entidad_id) : null;
          return (
            <li key={h.id} className="relative">
              <span className="absolute top-1 -left-[21px] h-2 w-2 rounded-full bg-primary/60" />
              <span className="font-medium text-ink">
                {ent?.nombre ?? h.entidad}
                {sujeto ? ` «${sujeto}»` : ''}
              </span>{' '}
              <span className="text-muted">
                {h.estado_anterior ? `${etiqueta(h.estado_anterior)} → ` : 'creado como '}
                <strong className="font-semibold">{etiqueta(h.estado_nuevo)}</strong>
              </span>
              <span className="block text-muted-light">{formatDateTime(h.fecha)}</span>
            </li>
          );
        })}
      </ol>
      {historial.length > VISIBLES && (
        <button type="button" onClick={() => setTodo((v) => !v)} className="mt-3 text-xs font-medium text-primary hover:underline">
          {todo ? 'Ver menos' : `Ver todo (${historial.length})`}
        </button>
      )}
    </Panel>
  );
}
