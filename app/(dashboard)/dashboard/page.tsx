'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, PackageX, ShoppingCart, Users, Wallet } from 'lucide-react';
import { BalanceHero } from '@/components/dashboard/BalanceHero';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ComposicionIngresoChart } from '@/components/charts/ComposicionIngresoChart';
import { FlujoMensualChart } from '@/components/charts/FlujoMensualChart';
import { MonthYearFilter } from '@/components/charts/MonthYearFilter';
import { PlataformasChart } from '@/components/charts/PlataformasChart';
import { TopProductosChart } from '@/components/charts/TopProductosChart';
import { useDashboard } from '@/lib/hooks/useDashboard';
import { usePlataformasDashboard } from '@/lib/hooks/usePlataformasDashboard';
import { formatCurrency } from '@/lib/utils/formatters';
import { anioActual, formatMesLargo, mesActual } from '@/lib/utils/charts';

function deltaRelativo(actual: number, previo: number): number | null {
  if (!previo) return null;
  return (actual - previo) / previo;
}

export default function DashboardPage() {
  const [mes, setMes] = useState(mesActual);
  const { data, loading, error } = useDashboard(mes);

  const [anioPlataformas, setAnioPlataformas] = useState(anioActual);
  const { data: dataPlataformas } = usePlataformasDashboard(anioPlataformas);

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-negative-surface bg-negative-surface/50 p-6 text-sm text-negative">
        {error}
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const k = data.kpis;
  const mesLabel = formatMesLargo(mes);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Resumen</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span>{mesLabel}</span>
            {k.notificacionesPendientes > 0 && (
              <>
                <span className="text-muted-light">·</span>
                <Link href="/notificaciones" className="font-medium text-primary hover:underline">
                  {k.notificacionesPendientes} notificación{k.notificacionesPendientes === 1 ? '' : 'es'} pendiente
                  {k.notificacionesPendientes === 1 ? '' : 's'}
                </Link>
              </>
            )}
          </p>
        </div>
        <MonthYearFilter value={mes} onChange={setMes} />
      </div>

      <div
        className={`flex flex-col gap-6 transition-opacity duration-200 ${loading ? 'pointer-events-none opacity-60' : 'opacity-100'}`}
      >
        <BalanceHero
          mesLabel={mesLabel.toLowerCase()}
          balance={k.balanceMes}
          balancePrev={k.ingresosMesPrev - k.egresosMesPrev}
          ingresos={k.ingresosMes}
          egresos={k.egresosMes}
          ventas={k.ventasMes.monto}
          dias={data.dias}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Ventas del mes"
            value={formatCurrency(k.ventasMes.monto)}
            hint={`${k.ventasMes.count} venta${k.ventasMes.count === 1 ? '' : 's'}`}
            icon={ShoppingCart}
            delta={deltaRelativo(k.ventasMes.monto, k.ventasMesPrev)}
          />
          <MetricCard
            label="Clientes activos"
            value={k.clientesActivos}
            hint="con tarjeta de fidelidad"
            icon={Users}
          />
          <MetricCard
            label="Por cobrar"
            value={formatCurrency(k.saldoPorCobrar)}
            hint={`${k.pedidosActivos} pedido${k.pedidosActivos === 1 ? '' : 's'} en curso`}
            icon={Wallet}
            href="/pedidos"
            tone={k.saldoPorCobrar > 0 ? 'warning' : 'default'}
          />
          <MetricCard
            label="Stock bajo"
            value={k.stockBajo}
            hint={`de ${k.productosActivos} producto${k.productosActivos === 1 ? '' : 's'}`}
            icon={k.stockBajo > 0 ? PackageX : Bell}
            href="/productos?stock_bajo=1"
            tone={k.stockBajo > 0 ? 'negative' : 'default'}
          />
        </div>

        {dataPlataformas && (
          <PlataformasChart
            anio={anioPlataformas}
            onCambiarAnio={setAnioPlataformas}
            plataformas={dataPlataformas.plataformas}
            datos={dataPlataformas.datos}
          />
        )}

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <FlujoMensualChart
            mes={mes}
            mesLabel={mesLabel}
            dias={data.dias}
            totalIngresos={k.ingresosMes}
            totalEgresos={k.egresosMes}
          />
          <ComposicionIngresoChart mes={mes} mesLabel={mesLabel} dias={data.dias} />
        </div>

        <TopProductosChart data={data.topProductos} mesLabel={mesLabel} />
      </div>
    </div>
  );
}
