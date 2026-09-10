'use client';

import { useState } from 'react';
import { Users, Receipt, PackageX, Bell } from 'lucide-react';
import { KPICard } from '@/components/cards/KPICard';
import { VentasVsAbonosChart } from '@/components/charts/VentasVsAbonosChart';
import { IngresosEgresosChart } from '@/components/charts/IngresosEgresosChart';
import { TopProductosChart } from '@/components/charts/TopProductosChart';
import { MonthYearFilter } from '@/components/charts/MonthYearFilter';
import { Loading } from '@/components/ui/Loading';
import { useClientes } from '@/lib/hooks/useClientes';
import { useNotificacionesAdmin } from '@/lib/hooks/useNotificacionesAdmin';
import { useProductos } from '@/lib/hooks/useProductos';
import { useTransacciones } from '@/lib/hooks/useTransacciones';
import { useVentas } from '@/lib/hooks/useVentas';
import { formatCurrency } from '@/lib/utils/formatters';
import { mesActual } from '@/lib/utils/charts';

export default function DashboardPage() {
  const [mes, setMes] = useState(mesActual);

  const { clientes, loading: loadingClientes } = useClientes();
  const { productos, loading: loadingProductos } = useProductos();
  const { ventas, loading: loadingVentas } = useVentas();
  const { transacciones, loading: loadingTransacciones } = useTransacciones();
  const { notificaciones, loading: loadingNotificaciones } = useNotificacionesAdmin();

  const loading = loadingClientes || loadingProductos || loadingVentas || loadingTransacciones || loadingNotificaciones;

  if (loading) return <Loading label="Cargando dashboard…" />;

  const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
  const productosStockBajo = productos.filter((p) => p.stock_actual <= p.stock_minimo).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Resumen general del negocio.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Clientes activos" value={clientes.length} icon={Users} />
        <KPICard label="Ventas totales" value={formatCurrency(totalVentas)} hint={`${ventas.length} ventas`} icon={Receipt} />
        <KPICard
          label="Stock bajo"
          value={productosStockBajo}
          hint={`de ${productos.length} productos`}
          icon={PackageX}
          href="/productos?stock_bajo=1"
          alerta={productosStockBajo > 0}
        />
        <KPICard label="Notificaciones" value={notificaciones.length} hint="pendientes" icon={Bell} />
      </div>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-medium text-muted">Actividad financiera</h2>
        <MonthYearFilter value={mes} onChange={setMes} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <VentasVsAbonosChart transacciones={transacciones} mes={mes} />
        <TopProductosChart ventas={ventas} productos={productos} mes={mes} />
        <IngresosEgresosChart transacciones={transacciones} mes={mes} />
      </div>
    </div>
  );
}
