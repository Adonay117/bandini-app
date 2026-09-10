'use client';

import { PartyPopper } from 'lucide-react';
import { Loading } from '@/components/ui/Loading';
import { NotificacionCard } from '@/components/cards/NotificacionCard';
import { useNotificacionesAdmin } from '@/lib/hooks/useNotificacionesAdmin';

export default function NotificacionesPage() {
  const { notificaciones, loading, error, marcarComoLeida } = useNotificacionesAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Notificaciones</h1>
        <p className="mt-1 text-sm text-muted">Mensajes listos para copiar y enviar por WhatsApp.</p>
      </div>

      {loading && <Loading label="Cargando notificaciones…" />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && notificaciones.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-secondary py-16 text-center">
          <PartyPopper size={20} className="text-muted-light" />
          <p className="text-sm text-muted-light">No hay notificaciones pendientes.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {notificaciones.map((n) => (
          <NotificacionCard key={n.id} notificacion={n} onMarcarLeida={marcarComoLeida} />
        ))}
      </div>
    </div>
  );
}
