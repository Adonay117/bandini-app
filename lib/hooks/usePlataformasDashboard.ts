'use client';

import { useCallback, useEffect, useState } from 'react';
import { cacheGet, cacheSet } from '@/lib/cache';

export interface MesPlataformas {
  mes: string;
  total: number;
  [plataforma: string]: number | string;
}

export interface PlataformasDashboardData {
  anio: number;
  meses: string[];
  plataformas: string[];
  datos: MesPlataformas[];
  /** Mismo formato que `datos`, pero con el precio de venta en vez de la ganancia. */
  datosVentas: MesPlataformas[];
}

export function usePlataformasDashboard(anio: number) {
  const [data, setData] = useState<PlataformasDashboardData | null>(() => cacheGet<PlataformasDashboardData>(`/api/dashboard/plataformas?anio=${anio}`) ?? null);
  const [loading, setLoading] = useState(() => !cacheGet<PlataformasDashboardData>(`/api/dashboard/plataformas?anio=${anio}`));
  const [error, setError] = useState<string | null>(null);

  const fetchDatos = useCallback(
    async (signal?: AbortSignal) => {
      const enCache = cacheGet<PlataformasDashboardData>(`/api/dashboard/plataformas?anio=${anio}`);
      if (enCache) {
        setData(enCache);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(`/api/dashboard/plataformas?anio=${anio}`, { signal });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar la comparativa por plataforma');
        const json: PlataformasDashboardData = await res.json();
        cacheSet(`/api/dashboard/plataformas?anio=${anio}`, json);
        setData(json);
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Error al cargar la comparativa por plataforma');
        setLoading(false);
      }
    },
    [anio]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchDatos(controller.signal);
    return () => controller.abort();
  }, [fetchDatos]);

  return { data, loading, error, refetch: fetchDatos };
}
