'use client';

import { useCallback, useEffect, useState } from 'react';
import { Cliente } from '@/lib/types';

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/clientes');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar clientes');
      setClientes(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  const crearCliente = useCallback(
    async (input: Partial<Cliente>) => {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al crear cliente');
      const cliente = await res.json();
      await fetchClientes();
      return cliente as Cliente;
    },
    [fetchClientes]
  );

  const actualizarCliente = useCallback(
    async (id: string, input: Partial<Cliente>) => {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al actualizar cliente');
      const cliente = await res.json();
      await fetchClientes();
      return cliente as Cliente;
    },
    [fetchClientes]
  );

  const eliminarCliente = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al eliminar cliente');
      await fetchClientes();
    },
    [fetchClientes]
  );

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  return { clientes, loading, error, fetchClientes, crearCliente, actualizarCliente, eliminarCliente };
}
