'use client';

import { Check, Loader2 } from 'lucide-react';
import { EstadoPedido } from '@/lib/types';
import { ESTADOS_PEDIDO, ESTADO_PEDIDO, pasoStepper } from '@/lib/utils/pedidos';

interface Props {
  actual: EstadoPedido;
  disabled?: boolean;
}

// Línea de tiempo solo informativa: el estado avanza solo con las compras,
// embarques, recepciones, entregas y pagos. La acción manual que quede
// (p. ej. "marcar como comprado") se ofrece aparte como botón de siguiente
// acción. Los parciales se pintan en el paso de su estado completo con un
// aro a medias.
export function EstadoStepper({ actual, disabled = false }: Props) {
  const indiceActual = pasoStepper(actual);
  const parcial = actual === 'recibido_parcial' || actual === 'entregado_parcial';

  return (
    <div className="relative">
      <ol aria-busy={disabled} className={`flex items-start overflow-x-auto transition-opacity ${disabled ? 'opacity-60' : ''}`}>
        {ESTADOS_PEDIDO.map((estado, i) => {
          const pasado = i < indiceActual;
          const activo = i === indiceActual;
          const conector = i > 0 && i <= indiceActual;
          const label = activo && parcial ? ESTADO_PEDIDO[actual].label : ESTADO_PEDIDO[estado].label;
          return (
            <li key={estado} className="flex min-w-[64px] flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : conector ? 'bg-primary' : 'bg-border'}`} />
                <span
                  aria-current={activo ? 'step' : undefined}
                  aria-label={activo ? `Estado actual: ${label}` : label}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    activo
                      ? parcial
                        ? 'border-2 border-primary bg-secondary/60 text-primary ring-4 ring-secondary/50'
                        : 'bg-primary text-white ring-4 ring-secondary/50'
                      : pasado
                        ? 'bg-primary/70 text-white'
                        : 'border border-dashed border-border bg-white text-muted-light'
                  }`}
                >
                  {pasado ? <Check size={13} /> : i + 1}
                </span>
                <span
                  className={`h-0.5 flex-1 ${
                    i === ESTADOS_PEDIDO.length - 1 ? 'opacity-0' : i < indiceActual ? 'bg-primary' : 'bg-border'
                  }`}
                />
              </div>
              <span className={`mt-1.5 text-center text-[11px] leading-tight ${activo ? 'font-semibold text-ink' : 'text-muted-light'}`}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      {disabled && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-light">
          <Loader2 size={12} className="animate-spin" />
          Actualizando estado…
        </div>
      )}
    </div>
  );
}
