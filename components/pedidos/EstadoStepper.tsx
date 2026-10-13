'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { EstadoPedido } from '@/lib/types';
import {
  ESTADOS_PEDIDO,
  ESTADOS_PEDIDO_MANUALES,
  ESTADO_PEDIDO,
  evaluarCambioEstado,
  pasoStepper,
  permitidoSinProductos,
} from '@/lib/utils/pedidos';
import { PopConfirm, PopConfirmRequest } from '@/components/ui/PopConfirm';

interface Props {
  actual: EstadoPedido;
  onChange: (estado: EstadoPedido) => void;
  disabled?: boolean;
  // Sin productos solo se puede quedar en cotización (o cancelar).
  sinProductos?: boolean;
}

// Los pasos logísticos (en tránsito, recibido, entregado) se muestran pero
// no se pueden tocar: los mueve el sistema al registrar embarques,
// recepciones y entregas. Los parciales se pintan en el paso de su estado
// completo con un aro a medias.
export function EstadoStepper({ actual, onChange, disabled = false, sinProductos = false }: Props) {
  const indiceActual = pasoStepper(actual);
  const parcial = actual === 'recibido_parcial' || actual === 'entregado_parcial';
  const [pendiente, setPendiente] = useState<PopConfirmRequest | null>(null);

  function handleClick(estado: EstadoPedido, boton: HTMLButtonElement) {
    const { requiereConfirmacion, mensaje } = evaluarCambioEstado(actual, estado);
    if (!requiereConfirmacion) {
      onChange(estado);
      return;
    }
    setPendiente({ anchor: boton, message: mensaje, onConfirm: () => onChange(estado) });
  }

  return (
    <>
      <div className="relative">
        <ol
          aria-busy={disabled}
          className={`flex items-start overflow-x-auto transition-opacity ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        >
          {ESTADOS_PEDIDO.map((estado, i) => {
            const pasado = i < indiceActual;
            const activo = i === indiceActual;
            const conector = i > 0 && i <= indiceActual;
            const manual = ESTADOS_PEDIDO_MANUALES.includes(estado);
            const bloqueado = sinProductos && !permitidoSinProductos(estado);
            const habilitado = manual && !bloqueado;
            const label = activo && parcial ? ESTADO_PEDIDO[actual].label : ESTADO_PEDIDO[estado].label;
            return (
              <li key={estado} className="flex min-w-[64px] flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : conector ? 'bg-primary' : 'bg-border'}`} />
                  <button
                    type="button"
                    disabled={disabled || (activo && !parcial) || !habilitado}
                    onClick={(e) => handleClick(estado, e.currentTarget)}
                    aria-current={activo ? 'step' : undefined}
                    title={
                      !manual
                        ? 'Se actualiza solo con embarques, recepciones y entregas'
                        : bloqueado
                          ? 'Agregá al menos un producto para avanzar'
                          : undefined
                    }
                    aria-label={
                      activo
                        ? `Estado actual: ${label}`
                        : habilitado
                          ? `Cambiar a ${label}`
                          : bloqueado
                            ? `${label} (requiere productos)`
                            : `${label} (automático)`
                    }
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                      activo
                        ? parcial
                          ? 'border-2 border-primary bg-secondary/60 text-primary ring-4 ring-secondary/50'
                          : 'bg-primary text-white ring-4 ring-secondary/50'
                        : pasado
                          ? 'bg-primary/70 text-white enabled:hover:bg-primary'
                          : habilitado
                            ? 'border border-border bg-white text-muted-light hover:border-primary/40 hover:text-primary'
                            : 'border border-dashed border-border bg-white text-muted-light'
                    } disabled:cursor-default`}
                  >
                    {pasado ? <Check size={13} /> : i + 1}
                  </button>
                  <span
                    className={`h-0.5 flex-1 ${
                      i === ESTADOS_PEDIDO.length - 1 ? 'opacity-0' : i < indiceActual ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                </div>
                <span
                  className={`mt-1.5 text-center text-[11px] leading-tight ${
                    activo ? 'font-semibold text-ink' : 'text-muted-light'
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
        {sinProductos && !disabled && (
          <p className="mt-2 text-[11px] text-muted-light">Agregá al menos un producto para confirmar el pedido.</p>
        )}
        {disabled && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-light">
            <Loader2 size={12} className="animate-spin" />
            Actualizando estado…
          </div>
        )}
      </div>
      <PopConfirm request={pendiente} onClose={() => setPendiente(null)} />
    </>
  );
}
