'use client';

import { useMemo, useState } from 'react';
import { area, curveMonotoneX, line, scaleBand, scaleLinear, stack, stackOffsetDiverging } from 'd3';
import { BarChart3, ChevronLeft, ChevronRight, Table2 } from 'lucide-react';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { PlataformaLogo } from '@/components/charts/PlataformaLogo';
import { MesPlataformas } from '@/lib/hooks/usePlataformasDashboard';
import { useAnchoElemento } from '@/lib/hooks/useAnchoElemento';
import { formatCurrency, formatCurrencyCompacto } from '@/lib/utils/formatters';
import { anioActual, mesActual } from '@/lib/utils/charts';
import { estiloPlataforma, nombrePlataforma } from '@/lib/utils/plataformas';

const ALTO_PLOT = 200;
const MARGEN = { arriba: 22, derecha: 4, abajo: 26, izquierda: 48 };
/** Columnas finas: nunca llenan el mes entero, el resto es aire. */
const ANCHO_MAX_COLUMNA = 24;
/** Separación entre segmentos apilados de una misma columna, en px. */
const GAP = 2;
const RADIO = 4;
const ANCHO_TOOLTIP = 210;

interface Fila {
  mes: string;
  total: number;
  valores: Record<string, number>;
  futuro: boolean;
}

function color(p: string): string {
  return estiloPlataforma(p).color;
}

function nombreMes(mes: string, estilo: 'short' | 'long'): string {
  const [anio, num] = mes.split('-').map(Number);
  const label = new Intl.DateTimeFormat('es-SV', { month: estilo }).format(new Date(anio, num - 1, 1)).replace('.', '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Rectángulo con las esquinas de arriba redondeadas (el extremo del dato) y la base recta. */
function columnaRedondeada(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIO, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

interface Props {
  anio: number;
  onCambiarAnio: (anio: number) => void;
  plataformas: string[];
  datos: MesPlataformas[];
  cargando?: boolean;
}

export function PlataformasChart({ anio, onCambiarAnio, plataformas, datos, cargando = false }: Props) {
  const [resaltada, setResaltada] = useState<string | null>(null);
  const [vista, setVista] = useState<'grafico' | 'tabla'>('grafico');

  const filas: Fila[] = useMemo(() => {
    const hoy = mesActual();
    return datos.map((d) => ({
      mes: d.mes,
      total: Number(d.total),
      valores: Object.fromEntries(plataformas.map((p) => [p, Number(d[p] ?? 0)])),
      futuro: d.mes > hoy,
    }));
  }, [datos, plataformas]);

  // Un pedido puede dejar pérdida: los porcentajes se calculan solo sobre
  // las plataformas que dejaron ganancia en el año.
  const hayDatos = filas.some((f) => plataformas.some((p) => f.valores[p] !== 0));

  const resumen = plataformas.map((p) => {
    const serie = filas.filter((f) => !f.futuro).map((f) => f.valores[p]);
    const total = serie.reduce((s, v) => s + v, 0);
    const iMejor = serie.reduce((im, v, i) => (v > serie[im] ? i : im), 0);
    return {
      plataforma: p,
      total,
      pct: 0,
      serie,
      mejorMes: serie[iMejor] > 0 ? filas[iMejor] : null,
      mejorMonto: serie[iMejor] ?? 0,
    };
  });
  const totalPositivo = resumen.reduce((s, r) => s + Math.max(r.total, 0), 0);
  for (const r of resumen) r.pct = totalPositivo ? Math.max(r.total, 0) / totalPositivo : 0;
  const lider = resumen.reduce((a, b) => (b.total > a.total ? b : a), resumen[0]);

  const acciones = (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-border bg-white p-1" role="group" aria-label="Vista">
        {(
          [
            ['grafico', BarChart3, 'Gráfico'],
            ['tabla', Table2, 'Tabla'],
          ] as const
        ).map(([v, Icono, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            aria-pressed={vista === v}
            className={`rounded-md p-1 transition-colors ${
              vista === v ? 'bg-surface text-ink' : 'text-muted-light hover:text-muted'
            }`}
            aria-label={label}
            title={label}
          >
            <Icono size={15} />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-white px-1 py-1">
        <button
          type="button"
          onClick={() => onCambiarAnio(anio - 1)}
          className="rounded-md p-1 text-muted-light hover:bg-surface hover:text-muted"
          aria-label="Año anterior"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="min-w-11 text-center text-sm font-semibold text-ink tabular-nums">{anio}</span>
        <button
          type="button"
          onClick={() => onCambiarAnio(anio + 1)}
          disabled={anio >= anioActual()}
          className="rounded-md p-1 text-muted-light hover:bg-surface hover:text-muted disabled:pointer-events-none disabled:opacity-30"
          aria-label="Año siguiente"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );

  const subtitulo =
    totalPositivo > 0 && lider
      ? `${nombrePlataforma(lider.plataforma)} deja el ${Math.round(lider.pct * 100)}% de la ganancia de ${anio}`
      : `Ya descontado lo pagado en la plataforma y el envío · ${anio}`;

  return (
    <ChartCard title="Ganancia por plataforma" subtitle={subtitulo} actions={acciones}>
      <div className={`transition-opacity duration-200 ${cargando ? 'pointer-events-none opacity-60' : ''}`}>
        {!hayDatos ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-sm text-muted-light">Todavía no hay pedidos en {anio}.</p>
          </div>
        ) : (
          <>
            <div
              className={`grid gap-3 sm:grid-cols-2 ${plataformas.length >= 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}
            >
              {resumen.map((r) => (
                <TarjetaPlataforma
                  key={r.plataforma}
                  {...r}
                  activa={resaltada === r.plataforma}
                  atenuada={resaltada != null && resaltada !== r.plataforma}
                  onClick={() => setResaltada((prev) => (prev === r.plataforma ? null : r.plataforma))}
                />
              ))}
            </div>

            <div className="mt-6">
              {vista === 'grafico' ? (
                <ColumnasApiladas filas={filas} plataformas={plataformas} resaltada={resaltada} anio={anio} />
              ) : (
                <TablaPlataformas filas={filas} plataformas={plataformas} />
              )}
            </div>
          </>
        )}
      </div>
    </ChartCard>
  );
}

// ── Tarjeta por marca ───────────────────────────────────────────────────

interface TarjetaProps {
  plataforma: string;
  total: number;
  pct: number;
  serie: number[];
  mejorMes: Fila | null;
  mejorMonto: number;
  activa: boolean;
  atenuada: boolean;
  onClick: () => void;
}

const SPARK_W = 120;
const SPARK_H = 36;

function TarjetaPlataforma({ plataforma, total, pct, serie, mejorMes, mejorMonto, activa, atenuada, onClick }: TarjetaProps) {
  const c = color(plataforma);

  const x = scaleLinear()
    .domain([0, Math.max(serie.length - 1, 1)])
    .range([0, SPARK_W]);
  const conDatos = serie.some((v) => v !== 0);
  const y = scaleLinear()
    .domain([Math.min(0, ...serie), Math.max(...serie, 1)])
    .range([SPARK_H - 3, 3]);
  const trazo = line<number>()
    .x((_, i) => x(i))
    .y((v) => y(v))
    .curve(curveMonotoneX)(serie);
  const relleno = area<number>()
    .x((_, i) => x(i))
    .y0(SPARK_H)
    .y1((v) => y(v))
    .curve(curveMonotoneX)(serie);
  const ultimo = serie.length - 1;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      aria-label={`${nombrePlataforma(plataforma)}: ${formatCurrency(total)}, ${Math.round(pct * 100)}% del año. ${
        activa ? 'Quitar resaltado' : 'Resaltar en el gráfico'
      }`}
      className={`flex flex-col rounded-xl border bg-white p-4 text-left transition-all hover:shadow-[var(--shadow-card-hover)] ${
        activa ? 'border-transparent' : 'border-border'
      } ${atenuada ? 'opacity-55 hover:opacity-100' : ''}`}
      style={activa ? { boxShadow: `0 0 0 2px ${c}` } : undefined}
    >
      <div className="flex h-5 items-center justify-between gap-2">
        <PlataformaLogo plataforma={plataforma} alto={plataforma === 'amazon' ? 20 : 16} />
        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-muted tabular-nums">
          {Math.round(pct * 100)}%
        </span>
      </div>

      <p className={`mt-3 text-xl font-semibold tracking-tight ${total < 0 ? 'text-negative' : 'text-ink'}`}>
        {formatCurrency(total)}
      </p>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: c }} />
      </div>

      <div className="relative mt-3 h-9 w-full">
        {conDatos && trazo && (
          <>
            <svg
              viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
              aria-hidden
            >
              {relleno && <path d={relleno} fill={c} opacity={0.1} />}
              <path
                d={trazo}
                fill="none"
                stroke={c}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {/* Punto final como HTML para que no se deforme con preserveAspectRatio="none". */}
            <span
              className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
              style={{
                left: `${(x(ultimo) / SPARK_W) * 100}%`,
                top: `${(y(serie[ultimo] ?? 0) / SPARK_H) * 100}%`,
                backgroundColor: c,
              }}
            />
          </>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-light">
        {mejorMes ? (
          <>
            Mejor mes: <span className="font-medium text-muted">{nombreMes(mejorMes.mes, 'long')}</span> ·{' '}
            {formatCurrencyCompacto(mejorMonto)}
          </>
        ) : (
          'Sin ganancia este año'
        )}
      </p>
    </button>
  );
}

// ── Columnas apiladas por mes (d3) ──────────────────────────────────────

interface ColumnasProps {
  filas: Fila[];
  plataformas: string[];
  resaltada: string | null;
  anio: number;
}

function ColumnasApiladas({ filas, plataformas, resaltada, anio }: ColumnasProps) {
  const { ref, ancho } = useAnchoElemento<HTMLDivElement>();
  const [activo, setActivo] = useState<number | null>(null);

  const anchoPlot = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 0);
  const altoTotal = MARGEN.arriba + ALTO_PLOT + MARGEN.abajo;

  const x = scaleBand<string>()
    .domain(filas.map((f) => f.mes))
    .range([0, anchoPlot]);
  const anchoColumna = Math.min(ANCHO_MAX_COLUMNA, x.bandwidth() * 0.62);

  // Con una marca resaltada, la escala y la etiqueta siguen a esa marca.
  const valorDe = (f: Fila) => (resaltada ? f.valores[resaltada] : f.total);
  // Apilado divergente: las ganancias suben desde 0 y las pérdidas bajan.
  const series = stack<Fila>()
    .keys(plataformas)
    .value((f, p) => f.valores[p])
    .offset(stackOffsetDiverging)(filas);
  const piso = Math.min(0, ...series.flatMap((s) => s.map((d) => d[0])));
  const techo = Math.max(1, ...series.flatMap((s) => s.map((d) => d[1])));

  const y = scaleLinear().domain([piso, techo]).nice(4).range([ALTO_PLOT, 0]);
  const ticks = y.ticks(4);

  const iMejor = filas.reduce((im, f, i) => (valorDe(f) > valorDe(filas[im]) ? i : im), 0);
  const etiquetasCortas = x.bandwidth() < 30;

  const filaActiva = activo != null ? filas[activo] : null;
  const centroActivo = activo != null ? MARGEN.izquierda + (x(filas[activo].mes) ?? 0) + x.bandwidth() / 2 : 0;
  const tooltipALaIzquierda = centroActivo > ancho / 2;

  return (
    <div ref={ref} className="relative" style={{ height: altoTotal }}>
      {ancho > 0 && (
        <svg width={ancho} height={altoTotal} role="img" aria-label={`Ganancia mensual por plataforma en ${anio}`}>
          <g transform={`translate(${MARGEN.izquierda},${MARGEN.arriba})`}>
            {ticks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line
                  x1={0}
                  x2={anchoPlot}
                  stroke={t === 0 && piso < 0 ? 'var(--color-muted-light)' : 'var(--color-border)'}
                  strokeWidth={1}
                />
                <text
                  x={-10}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-light text-[10px] tabular-nums"
                >
                  {formatCurrencyCompacto(t)}
                </text>
              </g>
            ))}

            {filas.map((f, i) => {
              const x0 = (x(f.mes) ?? 0) + (x.bandwidth() - anchoColumna) / 2;
              const atenuada = activo != null && activo !== i;

              // Segmentos con datos, de abajo hacia arriba; el de más arriba
              // lleva el redondeo. Las pérdidas van debajo del 0, atenuadas.
              const segmentos = series
                .map((s) => ({ p: s.key, y0: s[i][0], y1: s[i][1] }))
                .filter((s) => s.y1 - s.y0 > 0);
              const positivos = segmentos.filter((s) => s.y0 >= 0);
              const negativos = segmentos.filter((s) => s.y1 <= 0);
              const topeColumna = positivos.length ? positivos[positivos.length - 1].y1 : 0;

              return (
                <g key={f.mes} opacity={atenuada ? 0.45 : 1} className="transition-opacity">
                  {segmentos.length === 0 ? (
                    !f.futuro && <rect x={x0} y={y(0) - 2} width={anchoColumna} height={2} rx={1} fill="var(--color-border)" />
                  ) : (
                    <>
                      {positivos.map((s, j) => {
                        const esTope = j === positivos.length - 1;
                        const top = y(s.y1) + (esTope ? 0 : GAP);
                        const h = y(s.y0) - top;
                        if (h <= 0) return null;
                        const opacidad = resaltada && resaltada !== s.p ? 0.15 : 1;
                        return esTope ? (
                          <path key={s.p} d={columnaRedondeada(x0, top, anchoColumna, h)} fill={color(s.p)} opacity={opacidad} />
                        ) : (
                          <rect key={s.p} x={x0} y={top} width={anchoColumna} height={h} fill={color(s.p)} opacity={opacidad} />
                        );
                      })}
                      {negativos.map((s, j) => {
                        const top = y(s.y1) + (j > 0 ? GAP : 0);
                        const h = y(s.y0) - top;
                        if (h <= 0) return null;
                        const opacidad = resaltada && resaltada !== s.p ? 0.1 : 0.5;
                        return <rect key={s.p} x={x0} y={top} width={anchoColumna} height={h} fill={color(s.p)} opacity={opacidad} />;
                      })}
                    </>
                  )}

                  {/* Etiqueta directa solo en el mejor mes. */}
                  {i === iMejor && valorDe(f) > 0 && (
                    <text
                      x={x0 + anchoColumna / 2}
                      y={y(topeColumna) - 6}
                      textAnchor="middle"
                      className="fill-ink text-[11px] font-semibold tabular-nums"
                    >
                      {formatCurrencyCompacto(valorDe(f))}
                    </text>
                  )}

                  <text
                    x={(x(f.mes) ?? 0) + x.bandwidth() / 2}
                    y={ALTO_PLOT + 18}
                    textAnchor="middle"
                    className={`text-[11px] font-medium ${
                      f.futuro ? 'fill-border' : activo === i ? 'fill-ink' : 'fill-muted-light'
                    }`}
                  >
                    {etiquetasCortas ? nombreMes(f.mes, 'short').charAt(0) : nombreMes(f.mes, 'short')}
                  </text>

                  {/* Zona de hover: todo el ancho del mes y todo el alto del gráfico. */}
                  <rect
                    x={x(f.mes)}
                    y={-MARGEN.arriba}
                    width={x.bandwidth()}
                    height={ALTO_PLOT + MARGEN.arriba + MARGEN.abajo}
                    fill="transparent"
                    tabIndex={f.futuro ? -1 : 0}
                    role="button"
                    aria-label={`${nombreMes(f.mes, 'long')}: ${formatCurrency(f.total)}`}
                    className="cursor-pointer outline-none"
                    onPointerEnter={() => !f.futuro && setActivo(i)}
                    onPointerLeave={() => setActivo(null)}
                    onFocus={() => setActivo(i)}
                    onBlur={() => setActivo(null)}
                    onClick={() => !f.futuro && setActivo((prev) => (prev === i ? null : i))}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {filaActiva && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-border bg-white p-3 shadow-[var(--shadow-pop)]"
          style={{
            width: ANCHO_TOOLTIP,
            top: MARGEN.arriba,
            left: tooltipALaIzquierda
              ? Math.max(centroActivo - anchoColumna - ANCHO_TOOLTIP, 0)
              : Math.min(centroActivo + anchoColumna, ancho - ANCHO_TOOLTIP),
          }}
        >
          <p className="text-xs font-semibold text-ink">
            {nombreMes(filaActiva.mes, 'long')} {anio}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {plataformas.map((p) => {
              const v = filaActiva.valores[p];
              return (
                <li
                  key={p}
                  className={`flex items-center gap-2 text-xs ${resaltada && resaltada !== p ? 'opacity-45' : ''}`}
                >
                  <span className="h-0.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color(p) }} />
                  <span className="flex min-w-0 flex-1 items-center">
                    <PlataformaLogo plataforma={p} alto={p === 'amazon' ? 14 : 11} />
                  </span>
                  <span className={`font-semibold tabular-nums ${v < 0 ? 'text-negative' : 'text-ink'}`}>
                    {formatCurrency(v)}
                  </span>
                  <span className="w-8 text-right text-muted-light tabular-nums">
                    {filaActiva.total > 0 && v >= 0 ? `${Math.round((v / filaActiva.total) * 100)}%` : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-xs">
            <span className="text-muted">Ganancia</span>
            <span className={`font-semibold tabular-nums ${filaActiva.total < 0 ? 'text-negative' : 'text-ink'}`}>
              {formatCurrency(filaActiva.total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vista de tabla (mismos datos, sin depender del color ni del hover) ──

function TablaPlataformas({ filas, plataformas }: { filas: Fila[]; plataformas: string[] }) {
  const visibles = filas.filter((f) => !f.futuro);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] tracking-wide text-muted-light uppercase">
            <th className="py-2 pr-3 font-semibold">Mes</th>
            {plataformas.map((p) => (
              <th key={p} className="px-3 py-2 text-right font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: color(p) }} />
                  {nombrePlataforma(p)}
                </span>
              </th>
            ))}
            <th className="py-2 pl-3 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((f) => (
            <tr key={f.mes} className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-3 text-muted">{nombreMes(f.mes, 'long')}</td>
              {plataformas.map((p) => (
                <td key={p} className="px-3 py-2 text-right text-ink tabular-nums">
                  {f.valores[p] ? formatCurrency(f.valores[p]) : <span className="text-muted-light">—</span>}
                </td>
              ))}
              <td className="py-2 pl-3 text-right font-semibold text-ink tabular-nums">{formatCurrency(f.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
