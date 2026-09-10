'use client';

import { useCallback, useEffect, useState } from 'react';
import { Transaccion, TipoTransaccion } from '@/lib/types';

export function useTransacciones() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransacciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/transacciones');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar transacciones');
      setTransacciones(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar transacciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const crearTransaccion = useCallback(
    async (input: { tipo: TipoTransaccion; monto: number; categoria?: string }) => {
      const res = await fetch('/api/transacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al crear transacción');
      const transaccion = await res.json();
      await fetchTransacciones();
      return transaccion as Transaccion;
    },
    [fetchTransacciones]
  );

  useEffect(() => {
    fetchTransacciones();
  }, [fetchTransacciones]);

  return { transacciones, loading, error, fetchTransacciones, crearTransaccion };
}
