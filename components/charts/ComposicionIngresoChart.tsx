'use client';

import { useState } from 'react';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DiaDashboard } from '@/lib/hooks/useDashboard';
import { formatCurrency } from '@/lib/utils/formatters';
import { etiquetaDiaFecha } from '@/lib/utils/charts';

const COLOR_VENTAS = '#3f365b';
const COLOR_ABONOS = '#c08a3e';
const ALTO_BARRA = 96;

interface Props {
  mes: string;
  mesLabel: string;
  dias: DiaDashboard[];
}

export function ComposicionIngresoChart({ mes, mesLabel, dias }: Props) {
  const [activo, setActivo] = useState<number | null>(null);

  const totalVentas = dias.reduce((s, d) => s + d.ventas, 0);
  const totalAbonos = dias.reduce((s, d) => s + d.abonos, 0);
  const total = totalVentas + totalAbonos;
  const maxDia = Math.max(...dias.map((d) => d.ventas + d.abonos), 1);

  const pctVentas = total ? (totalVentas / total) * 100 : 0;
  const pctAbonos = total ? (totalAbonos / total) * 100 : 0;

  const diaActivo = activo != null ? (dias.find((d) => d.dia === activo) ?? null) : null;

  return (
    <ChartCard title="De dónde viene el ingreso" subtitle={`Ventas y abonos de pedidos · ${mesLabel}`}>
      {total === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-light">Sin ventas ni abonos este mes.</p>
        </div>
      ) : (
        <>
          <div className="flex h-11 w-full overflow-hidden rounded-xl">
            {pctVentas > 0 && (
              <div
                className="flex items-center px-3 text-xs font-semibold text-white"
                style={{ width: `${pctVentas}%`, backgroundColor: COLOR_VENTAS }}
              >
                {pctVentas >= 14 && `${Math.round(pctVentas)}%`}
              </div>
            )}
            {pctAbonos > 0 && (
              <div
                className="flex items-center justify-end px-3 text-xs font-semibold text-white"
                style={{ width: `${pctAbonos}%`, backgroundColor: COLOR_ABONOS }}
              >
                {pctAbonos >= 14 && `${Math.round(pctAbonos)}%`}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_VENTAS }} />
              <span className="text-muted">Ventas</span>
              <span className="font-semibold text-ink tabular-nums">{formatCurrency(totalVentas)}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_ABONOS }} />
              <span className="text-muted">Abonos de pedidos</span>
              <span className="font-semibold text-ink tabular-nums">{formatCurrency(totalAbonos)}</span>
            </span>
          </div>

          <p className="mt-5 mb-2 text-[11px] font-semibold tracking-wide text-muted-light uppercase">Ingreso por día</p>
          <div className="flex items-end gap-[3px]" style={{ height: ALTO_BARRA }}>
            {dias.map((d) => {
              const totalD = d.ventas + d.abonos;
              const h = Math.max((totalD / maxDia) * ALTO_BARRA, 4);
              const hVentas = totalD === 0 ? 0 : (d.ventas / totalD) * h;
              const hAbonos = h - hVentas;
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
                  className={`flex min-w-0 flex-1 flex-col justify-end transition-opacity ${
                    on ? 'opacity-100' : 'opacity-85 hover:opacity-100'
                  }`}
                  style={{ height: ALTO_BARRA }}
                  aria-label={`${etiquetaDiaFecha(mes, d.dia)}: ventas ${formatCurrency(d.ventas)}, abonos ${formatCurrency(d.abonos)}`}
                >
                  {totalD === 0 ? (
                    <span className="w-full rounded-full bg-border" style={{ height: 3 }} />
                  ) : (
                    <>
                      {hAbonos > 0 && (
                        <span
                          className="w-full rounded-t-[3px]"
                          style={{ height: hAbonos, backgroundColor: COLOR_ABONOS }}
                        />
                      )}
                      {hVentas > 0 && (
                        <span
                          className={`w-full ${hAbonos > 0 ? '' : 'rounded-t-[3px]'}`}
                          style={{ height: hVentas, backgroundColor: COLOR_VENTAS }}
                        />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-border pt-3 text-xs">
            {diaActivo ? (
              <p className="text-muted">
                <span className="font-semibold text-ink">{etiquetaDiaFecha(mes, diaActivo.dia)}</span>
                {' · '}Ventas {formatCurrency(diaActivo.ventas)}
                {' · '}Abonos {formatCurrency(diaActivo.abonos)}
              </p>
            ) : (
              <p className="text-muted-light">
                {pctVentas >= pctAbonos
                  ? `Las ventas aportan el ${Math.round(pctVentas)}% del ingreso del mes.`
                  : `Los abonos aportan el ${Math.round(pctAbonos)}% del ingreso del mes.`}
              </p>
            )}
          </div>
        </>
      )}
    </ChartCard>
  );
}
