'use client';

import { useCallback, useEffect, useState } from 'react';

export interface MovimientoDia {
  tipo: 'ingreso' | 'egreso';
  categoria: string | null;
  monto: number;
}

export interface DiaDashboard {
  dia: number;
  ingresos: number;
  egresos: number;
  // Ingresos/egresos del día agrupados por categoría de transacción.
  movimientos: MovimientoDia[];
  // Ganancia neta del día: pedidos por su fecha de creación, tienda por la
  // fecha de la venta.
  gananciaPedidos: number;
  gananciaTienda: number;
}

export interface ProductoTop {
  producto_id: string | null;
  nombre: string;
  imagen_url?: string | null;
  cantidad: number;
  total: number;
}

export interface DashboardKpis {
  clientesActivos: number;
  productosActivos: number;
  stockBajo: number;
  notificacionesPendientes: number;
  pedidosActivos: number;
  saldoPorCobrar: number;
  ventasMes: { count: number; monto: number };
  ventasMesPrev: number;
  ingresosMes: number;
  egresosMes: number;
  balanceMes: number;
  ingresosMesPrev: number;
  egresosMesPrev: number;
  // Ganancia neta: lo vendido menos lo pagado en la plataforma/inventario y
  // el envío. El costo del producto no es del negocio, así que no se cuenta.
  gananciaMes: number;
  gananciaMesPrev: number;
  gananciaPedidos: number;
  gananciaTienda: number;
  vendidoMes: number;
  // Productos de pedidos sin precio de compra: inflan la ganancia.
  productosSinCosto: number;
}

export interface DashboardData {
  mes: string;
  kpis: DashboardKpis;
  dias: DiaDashboard[];
  topProductos: ProductoTop[];
}

export function useDashboard(mes: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dashboard?mes=${mes}`, { signal });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar el dashboard');
        setData(await res.json());
        setLoading(false);
      } catch (err) {
        // Una petición abortada la reemplazó otra más nueva, que ya es dueña
        // del estado de carga: no la tocamos.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al cargar el dashboard');
        setLoading(false);
      }
    },
    [mes]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboard(controller.signal);
    return () => controller.abort();
  }, [fetchDashboard]);

  // `data` se mantiene visible mientras se recarga otro mes: la UI atenúa en
  // vez de parpadear a un esqueleto.
  return { data, loading, error, refetch: fetchDashboard };
}
