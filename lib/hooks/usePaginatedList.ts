'use client';

import { useCallback, useEffect, useState } from 'react';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  [key: string]: unknown;
}

// Hook genérico para listas con filtros + paginación server-side. Los
// filtros se pasan como un objeto plano de query params; se debounce 300ms
// antes de disparar el fetch (para no golpear la API en cada tecla) y
// vuelve a la página 1 cuando cambian. `extra` expone cualquier campo
// adicional que la API devuelva junto a data/total/page/pageSize (p.ej.
// totales agregados que no dependen de la página actual).
export function usePaginatedList<T, E extends Record<string, unknown> = Record<string, never>>(
  baseUrl: string,
  params: Record<string, string>,
  pageSize = 20
) {
  const paramsKey = JSON.stringify(params);
  const [debouncedParamsKey, setDebouncedParamsKey] = useState(paramsKey);
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [extra, setExtra] = useState<E>({} as E);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedParamsKey(paramsKey), 300);
    return () => clearTimeout(timeout);
  }, [paramsKey]);

  useEffect(() => {
    setPage(1);
  }, [debouncedParamsKey]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const filtros: Record<string, string> = JSON.parse(debouncedParamsKey);
        const qs = new URLSearchParams({ ...filtros, page: String(page), pageSize: String(pageSize) });
        const res = await fetch(`${baseUrl}?${qs.toString()}`);
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar datos');
        const json: PaginatedResponse<T> = await res.json();
        if (!cancelled) {
          setItems(json.data);
          setTotal(json.total);
          const resto: Record<string, unknown> = { ...json };
          delete resto.data;
          delete resto.total;
          delete resto.page;
          delete resto.pageSize;
          setExtra(resto as E);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, debouncedParamsKey, page, pageSize, reloadToken]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  return { items, total, totalPages, page, setPage, pageSize, loading, error, refetch, extra };
}
