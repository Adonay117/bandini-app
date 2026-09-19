'use client';

import { useRef, useState } from 'react';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DiaDashboard } from '@/lib/hooks/useDashboard';
import { formatCurrency } from '@/lib/utils/formatters';
import { etiquetaDiaFecha } from '@/lib/utils/charts';

const COLOR_VENTAS = '#3f365b';
const COLOR_ABONOS = '#c08a3e';
const ALTO_BARRA = 104;
/** Separación entre segmentos de una misma barra apilada (ventas/abonos), en px. */
const GAP_SEGMENTO = 2;
/** Mitad del ancho estimado del tooltip, para no dejarlo salir del contenedor. */
const TOOLTIP_MEDIO_ANCHO = 68;

interface Tooltip {
  dia: DiaDashboard;
  x: number;
  /** Distancia desde arriba del contenedor hasta el borde superior de la barra de ese día. */
  arriba: number;
}

interface Props {
  mes: string;
  mesLabel: string;
  dias: DiaDashboard[];
}

export function ComposicionIngresoChart({ mes, mesLabel, dias }: Props) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const barrasRef = useRef<HTMLDivElement>(null);

  const totalVentas = dias.reduce((s, d) => s + d.ventas, 0);
  const totalAbonos = dias.reduce((s, d) => s + d.abonos, 0);
  const total = totalVentas + totalAbonos;
  const maxDia = Math.max(...dias.map((d) => d.ventas + d.abonos), 1);

  const pctVentas = total ? (totalVentas / total) * 100 : 0;
  const pctAbonos = total ? (totalAbonos / total) * 100 : 0;

  const ultimoDia = dias.length ? dias[dias.length - 1].dia : 0;
  const diasConEtiqueta = new Set([1, 5, 10, 15, 20, 25, ultimoDia].filter((d) => d >= 1 && d <= ultimoDia));

  function mostrarTooltip(d: DiaDashboard, elementoBarra: HTMLElement) {
    const contenedor = barrasRef.current;
    if (!contenedor) return;
    const rectBarra = elementoBarra.getBoundingClientRect();
    const rectContenedor = contenedor.getBoundingClientRect();
    const centro = rectBarra.left + rectBarra.width / 2 - rectContenedor.left;
    const x = Math.min(
      Math.max(centro, TOOLTIP_MEDIO_ANCHO),
      Math.max(rectContenedor.width - TOOLTIP_MEDIO_ANCHO, TOOLTIP_MEDIO_ANCHO)
    );
    const h = Math.max(((d.ventas + d.abonos) / maxDia) * ALTO_BARRA, 4);
    setTooltip({ dia: d, x, arriba: ALTO_BARRA - h });
  }

  return (
    <ChartCard title="De dónde viene el ingreso" subtitle={`Ventas y abonos de pedidos · ${mesLabel}`}>
      {total === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-light">Sin ventas ni abonos este mes.</p>
        </div>
      ) : (
        <>
          <div className="flex h-11 w-full gap-0.5 overflow-hidden rounded-xl">
            {pctVentas > 0 && (
              <div
                className={`flex items-center px-3 text-xs font-semibold text-white ${pctAbonos > 0 ? 'rounded-l-xl' : 'rounded-xl'}`}
                style={{ width: `${pctVentas}%`, backgroundColor: COLOR_VENTAS }}
              >
                {pctVentas >= 14 && `${Math.round(pctVentas)}%`}
              </div>
            )}
            {pctAbonos > 0 && (
              <div
                className={`flex items-center justify-end px-3 text-xs font-semibold text-white ${pctVentas > 0 ? 'rounded-r-xl' : 'rounded-xl'}`}
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

          <p className="mt-5 mb-1 text-[11px] font-semibold tracking-wide text-muted-light uppercase">Ingreso por día</p>
          <div className="relative">
            {tooltip && (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-[var(--shadow-pop)]"
                style={{ left: tooltip.x, top: tooltip.arriba - 8 }}
              >
                <p className="font-semibold whitespace-nowrap">{etiquetaDiaFecha(mes, tooltip.dia.dia)}</p>
                <p className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-white/85">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLOR_VENTAS }} />
                  Ventas {formatCurrency(tooltip.dia.ventas)}
                </p>
                <p className="flex items-center gap-1.5 whitespace-nowrap text-white/85">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: COLOR_ABONOS }} />
                  Abonos {formatCurrency(tooltip.dia.abonos)}
                </p>
              </div>
            )}
            <div ref={barrasRef} className="flex items-end gap-[3px]" style={{ height: ALTO_BARRA }}>
              {dias.map((d) => {
                const totalD = d.ventas + d.abonos;
                const h = Math.max((totalD / maxDia) * ALTO_BARRA, 4);
                const conAmbos = d.ventas > 0 && d.abonos > 0;
                const hUtil = conAmbos ? h - GAP_SEGMENTO : h;
                const hVentas = totalD === 0 ? 0 : (d.ventas / totalD) * hUtil;
                const hAbonos = hUtil - hVentas;
                const on = tooltip?.dia.dia === d.dia;
                return (
                  <button
                    type="button"
                    key={d.dia}
                    onMouseEnter={(e) => mostrarTooltip(d, e.currentTarget)}
                    onMouseLeave={() => setTooltip(null)}
                    onFocus={(e) => mostrarTooltip(d, e.currentTarget)}
                    onBlur={() => setTooltip(null)}
                    onClick={(e) => mostrarTooltip(d, e.currentTarget)}
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
                        {conAmbos && <span className="w-full" style={{ height: GAP_SEGMENTO }} />}
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
            <div className="mt-1.5 flex gap-[3px]">
              {dias.map((d) => (
                <span key={d.dia} className="flex-1 text-center text-[10px] font-medium text-muted-light tabular-nums">
                  {diasConEtiqueta.has(d.dia) ? d.dia : ''}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-2 border-t border-border pt-3 text-xs">
            {tooltip ? (
              <p className="text-muted">
                <span className="font-semibold text-ink">{etiquetaDiaFecha(mes, tooltip.dia.dia)}</span>
                {' · '}Ventas {formatCurrency(tooltip.dia.ventas)}
                {' · '}Abonos {formatCurrency(tooltip.dia.abonos)}
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
