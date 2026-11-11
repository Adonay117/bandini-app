'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { notificar } from '@/lib/notificar';

// Activa/desactiva las notificaciones push en este dispositivo (navegador o APK).

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type Estado = 'cargando' | 'no-soportado' | 'bloqueado' | 'inactivo' | 'activo';

export function PushToggle() {
  const [estado, setEstado] = useState<Estado>('cargando');

  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setEstado('no-soportado');
      if (Notification.permission === 'denied') return setEstado('bloqueado');
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      const sub = await reg.pushManager.getSubscription();
      setEstado(sub ? 'activo' : 'inactivo');
    })().catch(() => setEstado('no-soportado'));
  }, []);

  async function activar() {
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') return setEstado(permiso === 'denied' ? 'bloqueado' : 'inactivo');

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const res = await fetch('/api/push/suscribir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'No se pudo registrar el dispositivo');
      setEstado('activo');
      notificar.exito('Notificaciones activadas', 'Recibirás avisos en este dispositivo.');
    } catch (err) {
      notificar.error('No se pudo activar', err instanceof Error ? err.message : undefined);
    }
  }

  async function desactivar() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/suscribir', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEstado('inactivo');
    } catch (err) {
      notificar.error('No se pudo desactivar', err instanceof Error ? err.message : undefined);
    }
  }

  if (estado === 'cargando' || estado === 'no-soportado') return null;

  if (estado === 'bloqueado') {
    return (
      <p className="flex items-center gap-2 text-xs text-muted">
        <BellOff size={14} /> Notificaciones bloqueadas: actívalas en los ajustes del dispositivo.
      </p>
    );
  }

  const activo = estado === 'activo';
  return (
    <button
      onClick={activo ? desactivar : activar}
      className="inline-flex w-fit items-center gap-2 rounded-xl border border-secondary px-3 py-2 text-sm text-ink transition hover:bg-secondary/40"
    >
      {activo ? <BellOff size={16} /> : <Bell size={16} />}
      {activo ? 'Desactivar avisos en este dispositivo' : 'Activar avisos en este dispositivo'}
    </button>
  );
}
