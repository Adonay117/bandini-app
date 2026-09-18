'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { EstadoPedido } from '@/lib/types';
import { ESTADOS_PEDIDO, ESTADO_PEDIDO, evaluarCambioEstado } from '@/lib/utils/pedidos';
import { PopConfirm, PopConfirmRequest } from '@/components/ui/PopConfirm';

interface Props {
  actual: EstadoPedido;
  onChange: (estado: EstadoPedido) => void;
  disabled?: boolean;
}

export function EstadoStepper({ actual, onChange, disabled = false }: Props) {
  const indiceActual = ESTADOS_PEDIDO.indexOf(actual);
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
            const conector = i > 0 && (i <= indiceActual);
            return (
              <li key={estado} className="flex min-w-[64px] flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <span
                    className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : conector ? 'bg-primary' : 'bg-border'}`}
                  />
                  <button
                    type="button"
                    disabled={disabled || activo}
                    onClick={(e) => handleClick(estado, e.currentTarget)}
                    aria-current={activo ? 'step' : undefined}
                    aria-label={activo ? `Estado actual: ${ESTADO_PEDIDO[estado].label}` : `Cambiar a ${ESTADO_PEDIDO[estado].label}`}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                      activo
                        ? 'bg-primary text-white ring-4 ring-secondary/50'
                        : pasado
                          ? 'bg-primary/70 text-white hover:bg-primary'
                          : 'border border-border bg-white text-muted-light hover:border-primary/40 hover:text-primary'
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
                  {ESTADO_PEDIDO[estado].label}
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
      <PopConfirm request={pendiente} onClose={() => setPendiente(null)} />
    </>
  );
}
