'use client';

import { useState } from 'react';
import { Cake, Gift, Package, AlertTriangle, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NotificacionAdmin, TipoNotificacion } from '@/lib/types';
import { formatDateTime } from '@/lib/utils/formatters';

const iconos: Record<TipoNotificacion, typeof Cake> = {
  cumpleanos: Cake,
  sticker_ganado: Gift,
  estado_pedido: Package,
  item_no_disponible: AlertTriangle,
};

interface NotificacionCardProps {
  notificacion: NotificacionAdmin;
  onMarcarLeida: (id: string) => Promise<void>;
}

export function NotificacionCard({ notificacion, onMarcarLeida }: NotificacionCardProps) {
  const [copiado, setCopiado] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const Icon = iconos[notificacion.tipo];

  async function copiar() {
    await navigator.clipboard.writeText(notificacion.cuerpo_mensaje);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function marcarLeida() {
    setMarcando(true);
    try {
      await onMarcarLeida(notificacion.id);
    } finally {
      setMarcando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-secondary/70 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
          <Icon size={17} strokeWidth={2} />
        </span>
        <div className="flex-1">
          <p className="font-medium text-ink">{notificacion.asunto}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted">{notificacion.cuerpo_mensaje}</p>
          <p className="mt-2 text-xs text-muted-light">{formatDateTime(notificacion.fecha_creacion)}</p>
        </div>
      </div>
      <div className="mt-3.5 flex gap-2">
        <Button type="button" variant="secondary" onClick={copiar}>
          {copiado ? <Check size={15} /> : <Copy size={15} />}
          {copiado ? 'Copiado' : 'Copiar'}
        </Button>
        <Button type="button" variant="ghost" onClick={marcarLeida} disabled={marcando}>
          <Check size={15} />
          {marcando ? 'Marcando…' : 'Marcar leído'}
        </Button>
      </div>
    </div>
  );
}
