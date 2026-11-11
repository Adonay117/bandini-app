'use client';

import { KeyboardEvent, PointerEvent, useMemo, useState } from 'react';
import { curveMonotoneX, line, scaleLinear } from 'd3';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DiaDashboard } from '@/lib/hooks/useDashboard';
import { useAnchoElemento } from '@/lib/hooks/useAnchoElemento';
import { formatCurrency, formatCurrencyCompacto } from '@/lib/utils/formatters';
import { etiquetaDiaFecha, mesActual } from '@/lib/utils/charts';

// Par validado (banda de luminosidad, croma, CVD y contraste sobre blanco):
// violeta de la marca para la tienda y ámbar para los pedidos.
const SERIES = [
  { clave: 'gananciaTienda', label: 'Tienda', color: '#5d4f91' },
  { clave: 'gananciaPedidos', label: 'Pedidos', color: '#b5752a' },
] as const;

type Clave = (typeof SERIES)[number]['clave'];
type Metrica = 'ganancia' | 'ventas';

const METRICAS: { clave: Metrica; label: string }[] = [
  { clave: 'ganancia', label: 'Ganancia' },
  { clave: 'ventas', label: 'Precio venta' },
];

/** Valor del día de una fuente según la métrica elegida. */
function valorDia(d: DiaDashboard, clave: Clave, metrica: Metrica): number {
  if (metrica === 'ganancia') return d[clave];
  return clave === 'gananciaTienda' ? d.ventasTienda : d.ventasPedidos;
}

const ALTO_PLOT = 140;
const MARGEN = { arriba: 10, derecha: 8, abajo: 22, izquierda: 44 };
const ANCHO_TOOLTIP = 176;

interface Punto {
  dia: number;
  /** Ganancia de ese día (para el "+$X ese día" del tooltip). */
  delDia: Record<Clave, number>;
  /** Ganancia acumulada del mes hasta ese día. */
  acumulado: Record<Clave, number>;
}

interface Props {
  mes: string;
  mesLabel: string;
  dias: DiaDashboard[];
}

// Ganancia acumulada del mes por fuente: dos líneas que suben día a día.
// Los pedidos son pocos y caen en días sueltos, así que el acumulado lee
// mejor que barras diarias casi vacías; una pérdida se ve como un escalón
// hacia abajo sin trucos de apilado.
export function ComposicionGananciaChart({ mes, mesLabel, dias }: Props) {
  const [activo, setActivo] = useState<number | null>(null);
  const [metrica, setMetrica] = useState<Metrica>('ganancia');
  const esVentas = metrica === 'ventas';
  const { ref, ancho } = useAnchoElemento<HTMLDivElement>();

  // En el mes en curso las líneas se cortan hoy: los días que faltan no son 0.
  const ultimoDia = useMemo(() => {
    if (mes !== mesActual()) return dias.length;
    return Math.min(new Date().getDate(), dias.length);
  }, [mes, dias.length]);

  const puntos: Punto[] = useMemo(() => {
    const acum: Record<Clave, number> = { gananciaTienda: 0, gananciaPedidos: 0 };
    return dias.slice(0, ultimoDia).map((d) => {
      for (const s of SERIES) acum[s.clave] += valorDia(d, s.clave, metrica);
      return {
        dia: d.dia,
        delDia: {
          gananciaTienda: valorDia(d, 'gananciaTienda', metrica),
          gananciaPedidos: valorDia(d, 'gananciaPedidos', metrica),
        },
        acumulado: { ...acum },
      };
    });
  }, [dias, ultimoDia, metrica]);

  const final = puntos[puntos.length - 1]?.acumulado ?? { gananciaTienda: 0, gananciaPedidos: 0 };
  const conMovimiento = dias.some(
    (d) => d.gananciaTienda !== 0 || d.gananciaPedidos !== 0 || d.ventasTienda !== 0 || d.ventasPedidos !== 0
  );

  // Participación solo sobre lo que sí dejó ganancia (una fuente en pérdida no "aporta" %).
  const positivo = SERIES.map((s) => Math.max(final[s.clave], 0));
  const totalPositivo = positivo[0] + positivo[1];

  const anchoPlot = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 0);
  const altoTotal = MARGEN.arriba + ALTO_PLOT + MARGEN.abajo;

  const x = scaleLinear()
    .domain([1, Math.max(dias.length, 2)])
    .range([0, anchoPlot]);
  const valores = puntos.flatMap((p) => SERIES.map((s) => p.acumulado[s.clave]));
  const y = scaleLinear()
    .domain([Math.min(0, ...valores), Math.max(1, ...valores)])
    .nice(3)
    .range([ALTO_PLOT, 0]);
  const ticks = y.ticks(3);
  const hayNegativos = y.domain()[0] < 0;

  const trazos = SERIES.map((s) => ({
    ...s,
    d:
      line<Punto>()
        .x((p) => x(p.dia))
        .y((p) => y(p.acumulado[s.clave]))
        .curve(curveMonotoneX)(puntos) ?? '',
  }));

  const diasEje = [...new Set([1, 10, 20, dias.length])];
  const puntoActivo = activo != null ? puntos[activo - 1] : null;
  const xActivo = puntoActivo ? MARGEN.izquierda + x(puntoActivo.dia) : 0;
  const tooltipALaIzquierda = xActivo > ancho / 2;

  function alMover(e: PointerEvent<SVGRectElement>) {
    const caja = e.currentTarget.getBoundingClientRect();
    const dia = Math.round(x.invert(e.clientX - caja.left));
    setActivo(Math.min(Math.max(dia, 1), puntos.length));
  }

  function alTeclear(e: KeyboardEvent<SVGRectElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const paso = e.key === 'ArrowRight' ? 1 : -1;
    setActivo((prev) => Math.min(Math.max((prev ?? puntos.length) + paso, 1), puntos.length));
  }

  return (
    <ChartCard
      title={esVentas ? 'De dónde viene la venta' : 'De dónde viene la ganancia'}
      subtitle={
        esVentas
          ? `Acumulado del mes, precio de venta sin descontar costo · ${mesLabel}`
          : `Acumulado del mes, ya descontado el costo · ${mesLabel}`
      }
      actions={
        <div className="flex items-center rounded-lg border border-border bg-white p-1" role="group" aria-label="Métrica">
          {METRICAS.map((m) => (
            <button
              key={m.clave}
              type="button"
              onClick={() => setMetrica(m.clave)}
              aria-pressed={metrica === m.clave}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                metrica === m.clave ? 'bg-surface text-ink' : 'text-muted-light hover:text-muted'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      }
    >
      {!conMovimiento ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-light">Sin ventas ni pedidos este mes.</p>
        </div>
      ) : (
        <>
          {/* Leyenda con los totales: identifica cada línea y da el número que importa. */}
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {SERIES.map((s, i) => (
              <div key={s.clave}>
                <p className="flex items-center gap-2 text-xs text-muted">
                  <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                  {totalPositivo > 0 && (
                    <span className="text-muted-light tabular-nums">{Math.round((positivo[i] / totalPositivo) * 100)}%</span>
                  )}
                </p>
                <p
                  className={`mt-1 text-lg font-semibold tracking-tight tabular-nums ${
                    final[s.clave] < 0 ? 'text-negative' : 'text-ink'
                  }`}
                >
                  {formatCurrency(final[s.clave])}
                </p>
              </div>
            ))}
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
                        stroke={t === 0 && hayNegativos ? 'var(--color-muted-light)' : 'var(--color-border)'}
                        strokeWidth={1}
                      />
                      <text x={-8} dy="0.32em" textAnchor="end" className="fill-muted-light text-[10px] tabular-nums">
                        {formatCurrencyCompacto(t)}
                      </text>
                    </g>
                  ))}

                  {diasEje.map((d) => (
                    <text
                      key={d}
                      x={x(d)}
                      y={ALTO_PLOT + 16}
                      textAnchor={d === 1 ? 'start' : d === dias.length ? 'end' : 'middle'}
                      className={`text-[10px] font-medium tabular-nums ${
                        puntoActivo?.dia === d ? 'fill-ink' : 'fill-muted-light'
                      }`}
                    >
                      {d}
                    </text>
                  ))}

                  {puntoActivo && (
                    <line
                      x1={x(puntoActivo.dia)}
                      x2={x(puntoActivo.dia)}
                      y1={0}
                      y2={ALTO_PLOT}
                      stroke="var(--color-muted-light)"
                      strokeWidth={1}
                    />
                  )}

                  {trazos.map((t) => (
                    <path
                      key={t.clave}
                      d={t.d}
                      fill="none"
                      stroke={t.color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}

                  {/* Punto en el día activo, o al final de cada línea si no hay hover. */}
                  {SERIES.map((s) => {
                    const p = puntoActivo ?? puntos[puntos.length - 1];
                    if (!p) return null;
                    return (
                      <circle
                        key={s.clave}
                        cx={x(p.dia)}
                        cy={y(p.acumulado[s.clave])}
                        r={4}
                        fill={s.color}
                        stroke="white"
                        strokeWidth={2}
                      />
                    );
                  })}

                  {/* Zona de hover: todo el plot; el crosshair encuentra el día más cercano. */}
                  <rect
                    x={0}
                    y={-MARGEN.arriba}
                    width={anchoPlot}
                    height={ALTO_PLOT + MARGEN.arriba + MARGEN.abajo}
                    fill="transparent"
                    tabIndex={0}
                    className="cursor-crosshair outline-none"
                    onPointerMove={alMover}
                    onPointerDown={alMover}
                    onPointerLeave={() => setActivo(null)}
                    onFocus={() => setActivo(puntos.length)}
                    onBlur={() => setActivo(null)}
                    onKeyDown={alTeclear}
                  />
                </g>
              </svg>
            )}

            {puntoActivo && (
              <div
                className="pointer-events-none absolute z-10 rounded-xl border border-border bg-white p-3 text-xs shadow-[var(--shadow-pop)]"
                style={{
                  width: ANCHO_TOOLTIP,
                  top: 0,
                  left: tooltipALaIzquierda
                    ? Math.max(xActivo - 12 - ANCHO_TOOLTIP, 0)
                    : Math.min(xActivo + 12, ancho - ANCHO_TOOLTIP),
                }}
              >
                <p className="font-semibold text-ink">{etiquetaDiaFecha(mes, puntoActivo.dia)}</p>
                {SERIES.map((s, i) => {
                  const acumulado = puntoActivo.acumulado[s.clave];
                  const delDia = puntoActivo.delDia[s.clave];
                  return (
                    <div key={s.clave} className={i === 0 ? 'mt-2' : 'mt-1.5'}>
                      <p className="flex items-center gap-2">
                        <span className="h-0.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="flex-1 text-muted">{s.label}</span>
                        <span className={`font-semibold tabular-nums ${acumulado < 0 ? 'text-negative' : 'text-ink'}`}>
                          {formatCurrency(acumulado)}
                        </span>
                      </p>
                      {delDia !== 0 && (
                        <p className="pl-[18px] text-muted-light tabular-nums">
                          {delDia > 0 ? '+' : '−'}
                          {formatCurrency(Math.abs(delDia))} ese día
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Los mismos datos sin depender del color ni del hover. */}
          <table className="sr-only">
            <caption>
              {esVentas ? 'Precio de venta' : 'Ganancia'} acumulado por día de {mesLabel}
            </caption>
            <thead>
              <tr>
                <th scope="col">Día</th>
                {SERIES.map((s) => (
                  <th key={s.clave} scope="col">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {puntos.map((p) => (
                <tr key={p.dia}>
                  <th scope="row">{etiquetaDiaFecha(mes, p.dia)}</th>
                  {SERIES.map((s) => (
                    <td key={s.clave}>{formatCurrency(p.acumulado[s.clave])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-2 text-xs text-muted-light">Los pedidos cuentan el día en que se crearon.</p>
        </>
      )}
    </ChartCard>
  );
}
