'use client';

import { useState } from 'react';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DiaDashboard } from '@/lib/hooks/useDashboard';
import { formatCurrency } from '@/lib/utils/formatters';
import { diaSemanaDe, etiquetaDiaFecha } from '@/lib/utils/charts';

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const VERDE: [number, number, number] = [31, 138, 91]; // --color-positive
const ROJO: [number, number, number] = [200, 69, 63]; // --color-negative

function estiloCelda(net: number, maxAbs: number, conMovimiento: boolean) {
  if (!conMovimiento) return { backgroundColor: 'var(--color-surface)', color: 'var(--color-muted-light)' };
  if (net === 0) return { backgroundColor: '#e6e0f4', color: 'var(--color-muted)' };
  const t = Math.min(Math.abs(net) / maxAbs, 1);
  const [r, g, b] = net > 0 ? VERDE : ROJO;
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${(0.14 + t * 0.78).toFixed(3)})`,
    color: t > 0.5 ? '#ffffff' : 'var(--color-ink)',
  };
}

interface Props {
  mes: string;
  mesLabel: string;
  dias: DiaDashboard[];
  totalIngresos: number;
  totalEgresos: number;
}

export function FlujoMensualChart({ mes, mesLabel, dias, totalIngresos, totalEgresos }: Props) {
  const [activo, setActivo] = useState<number | null>(null);

  const balance = totalIngresos - totalEgresos;
  const maxAbs = Math.max(...dias.map((d) => Math.abs(d.ingresos - d.egresos)), 1);
  const offset = dias.length ? diaSemanaDe(mes, 1) : 0;
  const conMovimiento = dias.some((d) => d.ingresos > 0 || d.egresos > 0);

  const diaActivo = activo != null ? (dias.find((d) => d.dia === activo) ?? null) : null;
  const netoActivo = diaActivo ? diaActivo.ingresos - diaActivo.egresos : 0;

  return (
    <ChartCard title="Flujo del mes" subtitle={`Resultado neto por día · ${mesLabel}`}>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          Ingresos <b className="font-semibold text-positive tabular-nums">{formatCurrency(totalIngresos)}</b>
        </span>
        <span>
          Egresos <b className="font-semibold text-negative tabular-nums">{formatCurrency(totalEgresos)}</b>
        </span>
        <span>
          Balance{' '}
          <b className={`font-semibold tabular-nums ${balance >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatCurrency(balance)}
          </b>
        </span>
      </div>

      {!conMovimiento ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-light">Sin movimientos este mes.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="grid" aria-label="Calendario de flujo diario">
            {DIAS_SEMANA.map((d, i) => (
              <div
                key={i}
                className="pb-1 text-center text-[10px] font-semibold tracking-wide text-muted-light uppercase"
              >
                {d}
              </div>
            ))}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`hueco-${i}`} aria-hidden />
            ))}
            {dias.map((d) => {
              const net = d.ingresos - d.egresos;
              const tuvo = d.ingresos > 0 || d.egresos > 0;
              const on = activo === d.dia;
              return (
                <button
                  type="button"
                  key={d.dia}
                  onMouseEnter={() => setActivo(d.dia)}
                  onMouseLeave={() => setActivo(null)}
                  onFocus={() => setActivo(d.dia)}
                  onBlur={() => setActivo(null)}
                  onClick={() => setActivo((prev) => (prev === d.dia ? null : d.dia))}
                  className={`flex h-9 items-start justify-start rounded-lg p-1.5 text-left text-[11px] font-medium tabular-nums sm:h-11 ${
                    on ? 'ring-2 ring-primary' : ''
                  }`}
                  style={estiloCelda(net, maxAbs, tuvo)}
                  aria-label={`${etiquetaDiaFecha(mes, d.dia)}: neto ${formatCurrency(net)}`}
                >
                  {d.dia}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            {diaActivo ? (
              <p className="text-muted">
                <span className="font-semibold text-ink">{etiquetaDiaFecha(mes, diaActivo.dia)}</span>
                {' · '}Ingresos {formatCurrency(diaActivo.ingresos)}
                {' · '}Egresos {formatCurrency(diaActivo.egresos)}
                {' · '}Neto{' '}
                <span className={netoActivo >= 0 ? 'font-semibold text-positive' : 'font-semibold text-negative'}>
                  {formatCurrency(netoActivo)}
                </span>
              </p>
            ) : (
              <p className="text-muted-light">Tocá un día para ver el detalle.</p>
            )}
            <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted-light">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: 'rgba(200,69,63,0.85)' }} />
                Pérdida
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: 'rgba(31,138,91,0.85)' }} />
                Ganancia
              </span>
            </div>
          </div>
        </>
      )}
    </ChartCard>
  );
}
