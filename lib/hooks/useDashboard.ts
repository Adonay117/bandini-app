'use client';

import { useCallback, useEffect, useState } from 'react';

export interface DiaDashboard {
  dia: number;
  ingresos: number;
  egresos: number;
  ventas: number;
  abonos: number;
}

export interface ProductoTop {
  nombre: string;
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
