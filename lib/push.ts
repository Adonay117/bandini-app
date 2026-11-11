import * as webpush from 'web-push';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

// Envío de Web Push a todos los dispositivos suscritos. Solo server-side.

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let configurado = false;
function configurar() {
  if (configurado) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configurado = true;
}

export async function enviarPushATodos(payload: PushPayload) {
  configurar();
  const supabase = createSupabaseAdminClient();
  const { data: subs, error } = await supabase.from('push_suscripciones').select('endpoint, p256dh, auth');
  if (error) throw new Error(error.message);

  const caducadas: string[] = [];
  let enviadas = 0;

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
        enviadas++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: la suscripción ya no existe (app desinstalada o permiso revocado).
        if (status === 404 || status === 410) caducadas.push(s.endpoint);
      }
    })
  );

  if (caducadas.length > 0) {
    await supabase.from('push_suscripciones').delete().in('endpoint', caducadas);
  }

  return { enviadas, eliminadas: caducadas.length };
}
