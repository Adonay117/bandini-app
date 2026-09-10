'use client';

import { useCallback, useEffect, useState } from 'react';
import { Producto } from '@/lib/types';

export function useProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/productos');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar productos');
      setProductos(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  const crearProducto = useCallback(
    async (input: Partial<Producto>) => {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al crear producto');
      const producto = await res.json();
      await fetchProductos();
      return producto as Producto;
    },
    [fetchProductos]
  );

  const actualizarProducto = useCallback(
    async (id: string, input: Partial<Producto>) => {
      const res = await fetch(`/api/productos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al actualizar producto');
      const producto = await res.json();
      await fetchProductos();
      return producto as Producto;
    },
    [fetchProductos]
  );

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  return { productos, loading, error, fetchProductos, crearProducto, actualizarProducto };
}
