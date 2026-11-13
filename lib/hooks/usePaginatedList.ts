'use client';

import { useCallback, useEffect, useState } from 'react';
import { cacheGet, cacheSet } from '@/lib/cache';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  [key: string]: unknown;
}

function urlLista(baseUrl: string, paramsKey: string, page: number, pageSize: number) {
  const filtros: Record<string, string> = JSON.parse(paramsKey);
  return `${baseUrl}?${new URLSearchParams({ ...filtros, page: String(page), pageSize: String(pageSize) }).toString()}`;
}

function extraDe<T>(json: PaginatedResponse<T>): Record<string, unknown> {
  const resto: Record<string, unknown> = { ...json };
  delete resto.data;
  delete resto.total;
  delete resto.page;
  delete resto.pageSize;
  return resto;
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
  // Si ya se cargó esta lista, se muestra al instante y se revalida en segundo plano.
  const [inicial] = useState(() => cacheGet<PaginatedResponse<T>>(urlLista(baseUrl, paramsKey, 1, pageSize)));
  const [items, setItems] = useState<T[]>(inicial?.data ?? []);
  const [total, setTotal] = useState(inicial?.total ?? 0);
  const [extra, setExtra] = useState<E>(inicial ? (extraDe(inicial) as E) : ({} as E));
  const [loading, setLoading] = useState(!inicial);
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
      const url = urlLista(baseUrl, debouncedParamsKey, page, pageSize);
      const enCache = cacheGet<PaginatedResponse<T>>(url);
      if (enCache) {
        setItems(enCache.data);
        setTotal(enCache.total);
        setExtra(extraDe(enCache) as E);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar datos');
        const json: PaginatedResponse<T> = await res.json();
        cacheSet(url, json);
        if (!cancelled) {
          setItems(json.data);
          setTotal(json.total);
          setExtra(extraDe(json) as E);
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
