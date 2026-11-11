'use client';

import { useMemo, useState } from 'react';
import { scaleBand, scaleLinear } from 'd3';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DiaDashboard, MovimientoDia } from '@/lib/hooks/useDashboard';
import { useAnchoElemento } from '@/lib/hooks/useAnchoElemento';
import { etiquetaCategoria, formatCurrency, formatCurrencyCompacto } from '@/lib/utils/formatters';
import { etiquetaDiaFecha } from '@/lib/utils/charts';

// Par divergente validado (CVD y contraste sobre blanco): azul para lo que
// entra, rojo para lo que sale. Verde/rojo no pasa para deuteranopía; además
// la posición (arriba/abajo del 0) ya distingue uno de otro sin el color.
const COLOR = { ingreso: '#2f6fb0', egreso: '#c8453f' } as const;
const LABEL = { ingreso: 'Entró', egreso: 'Salió' } as const;

const ALTO_PLOT = 180;
const MARGEN = { arriba: 8, derecha: 2, abajo: 22, izquierda: 48 };
const ANCHO_MAX_BARRA = 14;
const RADIO = 4;
/** Aire entre la barra y la línea del 0, para que entrada y salida no se toquen. */
const SEPARACION = 1;
const ANCHO_TOOLTIP = 220;

/** Barra con el extremo libre redondeado: arriba para ingresos, abajo para egresos. */
function barra(x: number, y: number, w: number, h: number, haciaAbajo: boolean): string {
  const r = Math.min(RADIO, h, w / 2);
  if (haciaAbajo) {
    return `M${x},${y}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w - r}Q${x + w},${y + h} ${x + w},${y + h - r}V${y}Z`;
  }
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function porTipo(movs: MovimientoDia[], tipo: MovimientoDia['tipo']) {
  return movs.filter((m) => m.tipo === tipo && m.monto > 0).sort((a, b) => b.monto - a.monto);
}

interface Props {
  mes: string;
  mesLabel: string;
  dias: DiaDashboard[];
}

// Movimientos de caja del mes: cada día, lo que entró sube y lo que salió
// baja desde el 0; debajo, el total del mes por concepto. Es caja, no
// ganancia: un abono entra completo aunque parte sea para la plataforma.
export function MovimientosChart({ mes, mesLabel, dias }: Props) {
  const [activo, setActivo] = useState<number | null>(null);
  const { ref, ancho } = useAnchoElemento<HTMLDivElement>();

  const totalIngresos = dias.reduce((s, d) => s + d.ingresos, 0);
  const totalEgresos = dias.reduce((s, d) => s + d.egresos, 0);
  const neto = totalIngresos - totalEgresos;
  const conMovimiento = totalIngresos > 0 || totalEgresos > 0;

  // Total del mes por concepto, a partir del detalle de cada día.
  const conceptos = useMemo(() => {
    const acum = new Map<string, MovimientoDia>();
    for (const d of dias) {
      for (const m of d.movimientos) {
        const clave = `${m.tipo}:${m.categoria ?? ''}`;
        const actual = acum.get(clave);
        if (actual) actual.monto += m.monto;
        else acum.set(clave, { ...m });
      }
    }
    const todos = [...acum.values()];
    return { ingreso: porTipo(todos, 'ingreso'), egreso: porTipo(todos, 'egreso') };
  }, [dias]);
  const maxConcepto = Math.max(1, ...conceptos.ingreso.map((m) => m.monto), ...conceptos.egreso.map((m) => m.monto));

  const anchoPlot = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 0);
  const altoTotal = MARGEN.arriba + ALTO_PLOT + MARGEN.abajo;

  const x = scaleBand<number>()
    .domain(dias.map((d) => d.dia))
    .range([0, anchoPlot]);
  const anchoBarra = Math.max(Math.min(ANCHO_MAX_BARRA, x.bandwidth() - 2), 2);
  const y = scaleLinear()
    .domain([-Math.max(...dias.map((d) => d.egresos), 1), Math.max(...dias.map((d) => d.ingresos), 1)])
    .nice(4)
    .range([ALTO_PLOT, 0]);
  const ticks = y.ticks(4);
  const y0 = y(0);

  const ultimoDia = dias.length ? dias[dias.length - 1].dia : 0;
  const diasConEtiqueta = new Set([1, 5, 10, 15, 20, 25, ultimoDia]);

  const diaActivo = activo != null ? (dias.find((d) => d.dia === activo) ?? null) : null;
  const centroActivo = diaActivo ? MARGEN.izquierda + (x(diaActivo.dia) ?? 0) + x.bandwidth() / 2 : 0;
  const tooltipALaIzquierda = centroActivo > ancho / 2;

  return (
    <ChartCard title="Movimientos de ingreso y egreso" subtitle={`Dinero que entró y salió de caja · ${mesLabel}`}>
      {!conMovimiento ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-light">Sin movimientos este mes.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {(['ingreso', 'egreso'] as const).map((tipo) => (
              <div key={tipo}>
                <p className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: COLOR[tipo] }} />
                  {LABEL[tipo]}
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-ink tabular-nums">
                  {formatCurrency(tipo === 'ingreso' ? totalIngresos : totalEgresos)}
                </p>
              </div>
            ))}
            <div>
              <p className="text-xs text-muted">Neto</p>
              <p
                className={`mt-1 text-lg font-semibold tracking-tight tabular-nums ${
                  neto < 0 ? 'text-negative' : 'text-ink'
                }`}
              >
                {formatCurrency(neto)}
              </p>
            </div>
          </div>

          <div ref={ref} className="relative mt-4" style={{ height: altoTotal }}>
            {ancho > 0 && (
              <svg width={ancho} height={altoTotal} aria-hidden>
                <g transform={`translate(${MARGEN.izquierda},${MARGEN.arriba})`}>
                  {ticks.map((t) => (
                    <g key={t} transform={`translate(0,${y(t)})`}>
                      <line
                        x1={0}
                        x2={anchoPlot}
                        stroke={t === 0 ? 'var(--color-muted-light)' : 'var(--color-border)'}
                        strokeWidth={1}
                      />
                      <text x={-8} dy="0.32em" textAnchor="end" className="fill-muted-light text-[10px] tabular-nums">
                        {t < 0 ? '−' : ''}
                        {formatCurrencyCompacto(Math.abs(t))}
                      </text>
                    </g>
                  ))}

                  {dias.map((d) => {
                    const x0 = (x(d.dia) ?? 0) + (x.bandwidth() - anchoBarra) / 2;
                    const hIngreso = y0 - y(d.ingresos) - SEPARACION;
                    const hEgreso = y(-d.egresos) - y0 - SEPARACION;
                    return (
                      <g
                        key={d.dia}
                        opacity={activo != null && activo !== d.dia ? 0.4 : 1}
                        className="transition-opacity"
                      >
                        {d.ingresos > 0 && hIngreso > 0 && (
                          <path d={barra(x0, y(d.ingresos), anchoBarra, hIngreso, false)} fill={COLOR.ingreso} />
                        )}
                        {d.egresos > 0 && hEgreso > 0 && (
                          <path d={barra(x0, y0 + SEPARACION, anchoBarra, hEgreso, true)} fill={COLOR.egreso} />
                        )}
                        {diasConEtiqueta.has(d.dia) && (
                          <text
                            x={(x(d.dia) ?? 0) + x.bandwidth() / 2}
                            y={ALTO_PLOT + 16}
                            textAnchor="middle"
                            className={`text-[10px] font-medium tabular-nums ${
                              activo === d.dia ? 'fill-ink' : 'fill-muted-light'
                            }`}
                          >
                            {d.dia}
                          </text>
                        )}
                        {/* Zona de hover: todo el ancho del día y todo el alto del gráfico. */}
                        <rect
                          x={x(d.dia)}
                          y={-MARGEN.arriba}
                          width={x.bandwidth()}
                          height={altoTotal}
                          fill="transparent"
                          tabIndex={d.ingresos > 0 || d.egresos > 0 ? 0 : -1}
                          className="cursor-pointer outline-none"
                          onPointerEnter={() => setActivo(d.dia)}
                          onPointerLeave={() => setActivo(null)}
                          onFocus={() => setActivo(d.dia)}
                          onBlur={() => setActivo(null)}
                          onClick={() => setActivo((prev) => (prev === d.dia ? null : d.dia))}
                        />
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}

            {diaActivo && (
              <div
                className="pointer-events-none absolute z-10 rounded-xl border border-border bg-white p-3 text-xs shadow-[var(--shadow-pop)]"
                style={{
                  width: ANCHO_TOOLTIP,
                  top: 0,
                  left: tooltipALaIzquierda
                    ? Math.max(centroActivo - anchoBarra - ANCHO_TOOLTIP, 0)
                    : Math.min(centroActivo + anchoBarra, ancho - ANCHO_TOOLTIP),
                }}
              >
                <p className="font-semibold text-ink">{etiquetaDiaFecha(mes, diaActivo.dia)}</p>
                {diaActivo.movimientos.length === 0 ? (
                  <p className="mt-1.5 text-muted-light">Sin movimientos.</p>
                ) : (
                  <>
                    {(['ingreso', 'egreso'] as const).map((tipo) =>
                      porTipo(diaActivo.movimientos, tipo).map((m) => (
                        <p key={`${tipo}:${m.categoria}`} className="mt-1.5 flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: COLOR[tipo] }} />
                          <span className="min-w-0 flex-1 truncate text-muted">{etiquetaCategoria(m.categoria)}</span>
                          <span className="font-semibold text-ink tabular-nums">
                            {tipo === 'ingreso' ? '+' : '−'}
                            {formatCurrency(m.monto)}
                          </span>
                        </p>
                      ))
                    )}
                    <p className="mt-2 flex justify-between border-t border-border pt-2">
                      <span className="text-muted">Neto</span>
                      <span
                        className={`font-semibold tabular-nums ${
                          diaActivo.ingresos - diaActivo.egresos < 0 ? 'text-negative' : 'text-ink'
                        }`}
                      >
                        {formatCurrency(diaActivo.ingresos - diaActivo.egresos)}
                      </span>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Total del mes por concepto; la misma escala para entradas y salidas. */}
          <div className="mt-5 grid gap-6 border-t border-border pt-5 md:grid-cols-2">
            {(['ingreso', 'egreso'] as const).map((tipo) => (
              <div key={tipo}>
                <p className="mb-3 text-[11px] font-semibold tracking-wide text-muted-light uppercase">
                  {LABEL[tipo]} por
                </p>
                {conceptos[tipo].length === 0 ? (
                  <p className="text-sm text-muted-light">Nada este mes.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {conceptos[tipo].map((m) => (
                      <li key={m.categoria ?? ''}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-muted">{etiquetaCategoria(m.categoria)}</span>
                          <span className="font-semibold text-ink tabular-nums">{formatCurrency(m.monto)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(m.monto / maxConcepto) * 100}%`, backgroundColor: COLOR[tipo] }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Los mismos datos sin depender del color ni del hover. */}
          <table className="sr-only">
            <caption>Ingresos y egresos por día de {mesLabel}</caption>
            <thead>
              <tr>
                <th scope="col">Día</th>
                <th scope="col">Entró</th>
                <th scope="col">Salió</th>
              </tr>
            </thead>
            <tbody>
              {dias
                .filter((d) => d.ingresos > 0 || d.egresos > 0)
                .map((d) => (
                  <tr key={d.dia}>
                    <th scope="row">{etiquetaDiaFecha(mes, d.dia)}</th>
                    <td>{formatCurrency(d.ingresos)}</td>
                    <td>{formatCurrency(d.egresos)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}
    </ChartCard>
  );
}
