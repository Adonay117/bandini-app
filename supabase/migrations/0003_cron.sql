-- 0003_cron.sql
-- CRON diario: notifica cumpleaños de clientes a las 7:00 AM SV (13:00 UTC).

create extension if not exists pg_cron;

create or replace function notificar_cumpleanos()
returns void
language plpgsql
as $$
declare
  v_cliente record;
begin
  for v_cliente in
    select id, nombre, telefono
    from clientes
    where activo = true
      and acepta_notificaciones = true
      and fecha_nacimiento is not null
      and extract(month from fecha_nacimiento) = extract(month from current_date)
      and extract(day from fecha_nacimiento) = extract(day from current_date)
  loop
    insert into notificaciones_admin (cliente_id, tipo, asunto, cuerpo_mensaje)
    values (
      v_cliente.id,
      'cumpleanos',
      format('🎂 Hoy es el cumpleaños de %s', v_cliente.nombre),
      format(
        '¡Feliz cumpleaños, %s! 🎉 De parte de todo el equipo, esperamos que tengas un día increíble. (Tel: %s)',
        v_cliente.nombre, v_cliente.telefono
      )
    );
  end loop;
end;
$$;

select cron.schedule(
  'notificar-cumpleanos-diario',
  '0 13 * * *',
  $$select notificar_cumpleanos();$$
);
