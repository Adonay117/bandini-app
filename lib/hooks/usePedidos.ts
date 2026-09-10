'use client';

import { useCallback, useEffect, useState } from 'react';
import { EstadoPedido, Pedido } from '@/lib/types';

export function usePedidos(clienteId?: string) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = clienteId ? `/api/pedidos?cliente_id=${clienteId}` : '/api/pedidos';
      const res = await fetch(url);
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar pedidos');
      setPedidos(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  const crearPedido = useCallback(
    async (input: { cliente_id: string; estado?: EstadoPedido }) => {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al crear pedido');
      const pedido = await res.json();
      await fetchPedidos();
      return pedido as Pedido;
    },
    [fetchPedidos]
  );

  const cambiarEstado = useCallback(
    async (id: string, estado: EstadoPedido) => {
      const res = await fetch(`/api/pedidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cambiar estado');
      await fetchPedidos();
    },
    [fetchPedidos]
  );

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  return { pedidos, loading, error, fetchPedidos, crearPedido, cambiarEstado };
}
