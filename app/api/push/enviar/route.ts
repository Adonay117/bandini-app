import { NextRequest, NextResponse } from 'next/server';
import { enviarPushATodos } from '@/lib/push';

// Lo llama un Database Webhook de Supabase (INSERT en notificaciones_admin).
// No lleva sesión de usuario: se protege con un secreto compartido
// (header `x-webhook-secret`) y está excluido del login en proxy.ts.

const ETIQUETAS: Record<string, string> = {
  cumpleanos: '🎂 Cumpleaños',
  sticker_ganado: '⭐ Sticker ganado',
  item_no_disponible: '⚠️ Producto no disponible',
  estado_pedido: '📦 Pedido',
};

export async function POST(request: NextRequest) {
  if (request.headers.get('x-webhook-secret') !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const fila = payload?.record;
  if (payload?.type !== 'INSERT' || !fila) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  try {
    const resultado = await enviarPushATodos({
      title: ETIQUETAS[fila.tipo] ?? 'Bandini SV',
      body: fila.asunto ?? 'Tienes una notificación nueva',
      url: '/notificaciones',
      tag: fila.id,
    });
    return NextResponse.json({ ok: true, ...resultado });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
