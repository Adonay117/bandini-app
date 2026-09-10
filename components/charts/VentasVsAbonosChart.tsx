'use client';

import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { StatPill } from '@/components/charts/StatPill';
import { Transaccion } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { diasDelMes, formatDiaCorto, formatMesLargo } from '@/lib/utils/charts';

// Colores de marca Bandini: primary (morado) para Ventas, un dorado cálido
// para Abonos — par frío/cálido, se distinguen sin depender solo del tono.
const COLOR_VENTAS = '#3F365B'; // primary
const COLOR_ABONOS = '#C08A3E';

interface PuntoDia {
  fechaLabel: string;
  ventas: number;
  abonos: number;
}

export function VentasVsAbonosChart({ transacciones, mes }: { transacciones: Transaccion[]; mes: string }) {
  const data = useMemo<PuntoDia[]>(() => {
    const dias = diasDelMes(mes).map((fecha) => ({ fecha, ventas: 0, abonos: 0 }));

    for (const t of transacciones) {
      if (t.tipo !== 'ingreso') continue;
      const fecha = new Date(t.fecha);
      fecha.setHours(0, 0, 0, 0);
      const dia = dias.find((d) => d.fecha.getTime() === fecha.getTime());
      if (!dia) continue;
      if (t.categoria === 'venta') dia.ventas += t.monto;
      else if (t.categoria === 'abono_pedido') dia.abonos += t.monto;
    }

    return dias.map((d) => ({ fechaLabel: formatDiaCorto(d.fecha), ventas: d.ventas, abonos: d.abonos }));
  }, [transacciones, mes]);

  const totalVentas = data.reduce((s, d) => s + d.ventas, 0);
  const totalAbonos = data.reduce((s, d) => s + d.abonos, 0);
  const totalGeneral = totalVentas + totalAbonos;

  const comparativa =
    totalGeneral === 0
      ? 'Sin ingresos en este mes.'
      : totalVentas === totalAbonos
        ? 'Empatados en este mes.'
        : totalVentas > totalAbonos
          ? `Ventas genera más — ${Math.round((totalVentas / totalGeneral) * 100)}% del ingreso.`
          : `Abonos de pedidos genera más — ${Math.round((totalAbonos / totalGeneral) * 100)}% del ingreso.`;

  return (
    <div className="rounded-2xl border border-secondary/70 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted-light uppercase">
            Ventas vs. abonos de pedidos
          </h3>
          <p className="mt-1 text-xs text-muted-light">{formatMesLargo(mes)}</p>
          <p className="mt-1 text-sm text-muted">{comparativa}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <StatPill color={COLOR_VENTAS} label="Ventas del mes" value={formatCurrency(totalVentas)} />
          <StatPill color={COLOR_ABONOS} label="Abonos del mes" value={formatCurrency(totalAbonos)} />
        </div>
      </div>

      <div style={{ height: 240 }}>
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
              dataKey="ventas"
              name="Ventas"
              stroke={COLOR_VENTAS}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
            />
            <Line
              type="monotone"
              dataKey="abonos"
              name="Abonos de pedidos"
              stroke={COLOR_ABONOS}
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
