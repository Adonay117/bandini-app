'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

// Contador liviano de notificaciones sin leer para el badge del sidebar.
// Canal realtime con nombre propio para no chocar con useNotificacionesAdmin
// (que usa 'notificaciones_admin_changes' en la página de notificaciones).
export function useNotificacionesPendientes() {
  const [total, setTotal] = useState(0);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/notificaciones?visto=false');
      if (!res.ok) return;
      const data = await res.json();
      setTotal(Array.isArray(data) ? data.length : 0);
    } catch {
      // Silencioso: es solo un badge, no vale la pena mostrar un error.
    }
  }, []);

  useEffect(() => {
    refetch();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('sidebar_notificaciones_pendientes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones_admin' }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return total;
}
