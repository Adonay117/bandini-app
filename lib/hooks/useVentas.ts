'use client';

import { useCallback, useEffect, useState } from 'react';
import { Venta } from '@/lib/types';

export function useVentas(clienteId?: string) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVentas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = clienteId ? `/api/ventas?cliente_id=${clienteId}` : '/api/ventas';
      const res = await fetch(url);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar ventas');
      setVentas(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  const crearVenta = useCallback(async (input: {
    cliente_id: string | null;
    metodo_pago?: string;
    items: { producto_id: string; cantidad: number; precio_unitario: number; descuento?: number }[];
  }) => {
    const res = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Error al crear venta');
    return res.json();
  }, []);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  return { ventas, loading, error, fetchVentas, crearVenta };
}
