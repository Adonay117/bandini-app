-- 0011_realtime_notificaciones.sql
-- Bug: el contador de notificaciones sin leer del sidebar (useNotificacionesPendientes)
-- y la lista de /notificaciones (useNotificacionesAdmin) se suscriben a
-- postgres_changes de `notificaciones_admin`, pero la tabla nunca quedó
-- agregada a la publicación `supabase_realtime` — la publicación existe pero
-- está vacía, así que esos eventos nunca llegan. Efecto visible: al marcar
-- una notificación como leída, la lista se actualiza (filtro local en
-- marcarComoLeida), pero el contador del sidebar queda desactualizado hasta
-- recargar la página completa.
alter publication supabase_realtime add table notificaciones_admin;
