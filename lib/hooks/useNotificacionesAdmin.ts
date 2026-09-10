'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { NotificacionAdmin } from '@/lib/types';

export function useNotificacionesAdmin() {
  const [notificaciones, setNotificaciones] = useState<NotificacionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notificaciones?visto=false');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Error al cargar notificaciones');
      setNotificaciones(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const marcarComoLeida = useCallback(async (id: string) => {
    const res = await fetch(`/api/notificaciones/${id}`, { method: 'PATCH' });
    if (!res.ok) throw new Error((await res.json()).error ?? 'Error al marcar como leída');
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    refetch();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('notificaciones_admin_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificaciones_admin' },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { notificaciones, loading, error, refetch, marcarComoLeida };
}
