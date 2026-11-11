-- 0016_push_suscripciones.sql
-- Dispositivos (navegador / APK) suscritos a notificaciones push. Cada fila es
-- una suscripción Web Push. Solo se accede desde la API (service role), por eso
-- se activa RLS sin políticas: la anon key no puede leerla ni escribirla.
--
-- Después de aplicar esta migración, crear en Supabase (Database → Webhooks):
--   tabla: notificaciones_admin · evento: INSERT · tipo: HTTP Request (POST)
--   URL:   https://<tu-dominio>/api/push/enviar
--   Header: x-webhook-secret = <valor de PUSH_WEBHOOK_SECRET>

create table push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  fecha_creacion timestamptz not null default now()
);

alter table push_suscripciones enable row level security;
