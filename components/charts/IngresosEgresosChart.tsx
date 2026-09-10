'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { StatPill } from '@/components/charts/StatPill';
import { Transaccion } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { diasDelMes, formatDiaCorto, formatMesLargo } from '@/lib/utils/charts';

// Paleta de estado (buena/mala noticia), no categórica: ingreso = bueno, egreso = alerta.
const COLOR_INGRESOS = '#0ca30c';
const COLOR_EGRESOS = '#d03b3b';

interface PuntoDia {
  fechaLabel: string;
  ingresos: number;
  egresos: number;
}

export function IngresosEgresosChart({ transacciones, mes }: { transacciones: Transaccion[]; mes: string }) {
  const data = useMemo<PuntoDia[]>(() => {
    const dias = diasDelMes(mes).map((fecha) => ({ fecha, ingresos: 0, egresos: 0 }));

    for (const t of transacciones) {
      const fecha = new Date(t.fecha);
      fecha.setHours(0, 0, 0, 0);
      const dia = dias.find((d) => d.fecha.getTime() === fecha.getTime());
      if (!dia) continue;
      if (t.tipo === 'ingreso') dia.ingresos += t.monto;
      else dia.egresos += t.monto;
    }

    return dias.map((d) => ({ fechaLabel: formatDiaCorto(d.fecha), ingresos: d.ingresos, egresos: d.egresos }));
  }, [transacciones, mes]);

  const totalIngresos = data.reduce((s, d) => s + d.ingresos, 0);
  const totalEgresos = data.reduce((s, d) => s + d.egresos, 0);
  const balance = totalIngresos - totalEgresos;

  return (
    <div className="rounded-2xl border border-secondary/70 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-light uppercase">Ingresos vs. egresos</h3>
          <p className="mt-1 text-xs text-muted-light">{formatMesLargo(mes)}</p>
          <p className="mt-1 text-sm text-muted">
            Balance del mes:{' '}
            <span className={balance >= 0 ? 'font-medium text-emerald-700' : 'font-medium text-red-700'}>
              {formatCurrency(balance)}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <StatPill color={COLOR_INGRESOS} label="Ingresos del mes" value={formatCurrency(totalIngresos)} />
          <StatPill color={COLOR_EGRESOS} label="Egresos del mes" value={formatCurrency(totalEgresos)} />
        </div>
      </div>

      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e1dcef" strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="fechaLabel"
              interval={Math.max(Math.floor(data.length / 8), 1)}
              tick={{ fontSize: 11, fill: '#9c93ac' }}
              axisLine={{ stroke: '#e1dcef' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9c93ac' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCurrency(Number(v))}
              width={56}
            />
            <Tooltip content={ChartTooltip} cursor={{ stroke: '#e1dcef' }} />
            <Line
              type="monotone"
              dataKey="ingresos"
              name="Ingresos"
              stroke={COLOR_INGRESOS}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
            />
            <Line
              type="monotone"
              dataKey="egresos"
              name="Egresos"
              stroke={COLOR_EGRESOS}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
