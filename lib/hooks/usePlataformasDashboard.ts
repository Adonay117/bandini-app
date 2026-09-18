'use client';

import { useCallback, useEffect, useState } from 'react';

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
}

export function usePlataformasDashboard(anio: number) {
  const [data, setData] = useState<PlataformasDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDatos = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dashboard/plataformas?anio=${anio}`, { signal });
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar la comparativa por plataforma');
        setData(await res.json());
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
