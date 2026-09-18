'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { MesPlataformas } from '@/lib/hooks/usePlataformasDashboard';
import { formatCurrency } from '@/lib/utils/formatters';
import { anioActual, formatMesCorto } from '@/lib/utils/charts';
import { estiloPlataforma } from '@/lib/utils/plataformas';

const ALTO_BARRA = 140;

const NOMBRES: Record<string, string> = {
  shein: 'Shein',
  temu: 'Temu',
  amazon: 'Amazon',
  aliexpress: 'AliExpress',
  shopee: 'Shopee',
  otras: 'Otras',
};

function nombrePlataforma(p: string): string {
  return NOMBRES[p] ?? p.charAt(0).toUpperCase() + p.slice(1);
}

function colorPlataforma(p: string): string {
  return p === 'otras' ? '#8a8398' : estiloPlataforma(p).color;
}

interface Props {
  anio: number;
  onCambiarAnio: (anio: number) => void;
  plataformas: string[];
  datos: MesPlataformas[];
}

export function PlataformasChart({ anio, onCambiarAnio, plataformas, datos }: Props) {
  const [activo, setActivo] = useState<string | null>(null);

  const totalGeneral = datos.reduce((s, d) => s + Number(d.total), 0);
  const maxTotal = Math.max(...datos.map((d) => Number(d.total)), 1);

  const totalesPorPlataforma = plataformas.map((p) => ({
    plataforma: p,
    total: datos.reduce((s, d) => s + Number(d[p] ?? 0), 0),
  }));

  const mesActivo = activo ? (datos.find((d) => d.mes === activo) ?? null) : null;

  const selectorAnio = (
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
  );

  return (
    <ChartCard
      title="Ingresos por plataforma"
      subtitle={`Comparativa mensual · Shein, Temu, Amazon y AliExpress · ${anio}`}
      actions={selectorAnio}
    >
      {totalGeneral === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border">
          <p className="text-sm text-muted-light">Todavía no hay artículos de pedidos en este rango.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {totalesPorPlataforma.map(({ plataforma, total }) => (
              <span key={plataforma} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorPlataforma(plataforma) }} />
                <span className="text-muted">{nombrePlataforma(plataforma)}</span>
                <span className="font-semibold text-ink tabular-nums">{formatCurrency(total)}</span>
              </span>
            ))}
          </div>

          <div className="mt-5 overflow-x-auto pb-1">
            <div className="flex min-w-fit items-end gap-3" style={{ height: ALTO_BARRA }}>
              {datos.map((d) => {
                const total = Number(d.total);
                const h = Math.max((total / maxTotal) * ALTO_BARRA, total > 0 ? 4 : 2);
                const on = activo === d.mes;
                return (
                  <button
                    type="button"
                    key={d.mes}
                    onMouseEnter={() => setActivo(d.mes)}
                    onMouseLeave={() => setActivo(null)}
                    onFocus={() => setActivo(d.mes)}
                    onBlur={() => setActivo(null)}
                    onClick={() => setActivo((prev) => (prev === d.mes ? null : d.mes))}
                    className={`flex w-11 shrink-0 flex-col items-center justify-end gap-1.5 transition-opacity ${
                      on ? 'opacity-100' : 'opacity-85 hover:opacity-100'
                    }`}
                    aria-label={`${formatMesCorto(d.mes)}: ${formatCurrency(total)} en total`}
                  >
                    <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-[4px]" style={{ height: h }}>
                      {total === 0 ? (
                        <span className="w-full bg-border" style={{ height: 3 }} />
                      ) : (
                        plataformas.map((p) => {
                          const monto = Number(d[p] ?? 0);
                          if (monto <= 0) return null;
                          const hp = (monto / total) * h;
                          return <span key={p} className="w-full" style={{ height: hp, backgroundColor: colorPlataforma(p) }} />;
                        })
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-muted-light tabular-nums">{formatMesCorto(d.mes)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 border-t border-border pt-3 text-xs">
            {mesActivo ? (
              <p className="text-muted">
                <span className="font-semibold text-ink">{formatMesCorto(mesActivo.mes)}</span>
                {' · '}
                {plataformas
                  .filter((p) => Number(mesActivo[p] ?? 0) > 0)
                  .map((p) => `${nombrePlataforma(p)} ${formatCurrency(Number(mesActivo[p]))}`)
                  .join(' · ')}
                {' · '}
                Total <span className="font-semibold text-ink">{formatCurrency(Number(mesActivo.total))}</span>
              </p>
            ) : (
              <p className="text-muted-light">Tocá un mes para ver el detalle por plataforma.</p>
            )}
          </div>
        </>
      )}
    </ChartCard>
  );
}
