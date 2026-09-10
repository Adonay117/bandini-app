-- 0002_triggers.sql
-- Todas las automatizaciones de base de datos (estado final, consolidado):
-- acumulación de stickers (compartida entre ventas y abonos de pedidos),
-- recálculo de totales de pedido, reembolsos, y el libro de ingresos/egresos.
--
-- Nota: el trigger de "cambio de estado de pedido → notificación" que
-- existió en versiones anteriores fue eliminado a propósito — ese detalle
-- ahora vive en la página del pedido con el botón "Copiar detalle", que
-- arma el mensaje al momento con el estado actual.

-- ── acumular_monto_cliente ──────────────────────────────────────────────
-- Lógica central del programa de fidelidad. La usan tanto una venta como
-- un abono de pedido: $50 acumulados = 1 sticker; al llegar a 5 stickers
-- ($250) se gana un premio de $12; al llegar a 10 ($500) se gana $25 y se
-- resetea la tarjeta.
create or replace function acumular_monto_cliente(p_cliente_id uuid, p_monto numeric)
returns void
language plpgsql
as $$
declare
  v_monto_anterior numeric(10,2);
  v_stickers_anterior int;
  v_monto_nuevo numeric(10,2);
  v_stickers_nuevo int;
  v_nombre_cliente text;
begin
  select monto_acumulado_tarjeta, stickers_actuales, nombre
    into v_monto_anterior, v_stickers_anterior, v_nombre_cliente
  from clientes
  where id = p_cliente_id
  for update;

  if not found then
    return;
  end if;

  v_monto_nuevo := v_monto_anterior + p_monto;
  v_stickers_nuevo := floor(v_monto_nuevo / 50);

  if v_stickers_nuevo >= 10 and v_stickers_anterior < 10 then
    insert into premios_stickers (cliente_id, stickers_alcanzados, premio_monto, monto_acumulado_cuando_gano)
    values (p_cliente_id, 10, 25, v_monto_nuevo);

    insert into notificaciones_admin (cliente_id, tipo, asunto, cuerpo_mensaje)
    values (
      p_cliente_id,
      'sticker_ganado',
      '🎁 ¡Tarjeta completada!',
      format('%s completó su tarjeta de stickers y ganó $25 de premio. ¡Felicítala!', v_nombre_cliente)
    );

    update clientes
    set monto_acumulado_tarjeta = 0,
        stickers_actuales = 0,
        total_moneda_gastada = total_moneda_gastada + p_monto,
        total_tarjetas_completadas = total_tarjetas_completadas + 1,
        total_premios_ganados = total_premios_ganados + 1
    where id = p_cliente_id;

  elsif v_stickers_nuevo >= 5 and v_stickers_anterior < 5 then
    insert into premios_stickers (cliente_id, stickers_alcanzados, premio_monto, monto_acumulado_cuando_gano)
    values (p_cliente_id, 5, 12, v_monto_nuevo);

    insert into notificaciones_admin (cliente_id, tipo, asunto, cuerpo_mensaje)
    values (
      p_cliente_id,
      'sticker_ganado',
      '🎁 Cliente ganó premio de $12',
      format('%s alcanzó 5 stickers y ganó $12 de premio.', v_nombre_cliente)
    );

    update clientes
    set monto_acumulado_tarjeta = v_monto_nuevo,
        stickers_actuales = v_stickers_nuevo,
        total_moneda_gastada = total_moneda_gastada + p_monto,
        total_premios_ganados = total_premios_ganados + 1
    where id = p_cliente_id;

  else
    update clientes
    set monto_acumulado_tarjeta = v_monto_nuevo,
        stickers_actuales = v_stickers_nuevo,
        total_moneda_gastada = total_moneda_gastada + p_monto
    where id = p_cliente_id;
  end if;
end;
$$;

-- ── TRIGGER: venta → inventario, ingreso, stickers ─────────────────────
create or replace function registrar_venta_con_stickers()
returns trigger
language plpgsql
as $$
begin
  insert into movimientos_inventario (producto_id, tipo, cantidad, venta_id)
  values (new.producto_id, 'salida', new.cantidad, new.id);

  update productos
  set stock_actual = stock_actual - new.cantidad
  where id = new.producto_id;

  insert into transacciones (tipo, monto, categoria)
  values ('ingreso', new.total, 'venta');

  if new.cliente_id is not null then
    perform acumular_monto_cliente(new.cliente_id, new.total);
  end if;

  return new;
end;
$$;

create trigger trg_registrar_venta_con_stickers
  after insert on ventas
  for each row
  execute function registrar_venta_con_stickers();

-- ── TRIGGER: pedido_items → recalcula totales del pedido ───────────────
create or replace function recalcular_totales_pedido()
returns trigger
language plpgsql
as $$
declare
  v_pedido_id uuid;
  v_total_articulos numeric(10,2);
begin
  v_pedido_id := coalesce(new.pedido_id, old.pedido_id);

  select coalesce(sum(precio), 0)
    into v_total_articulos
  from pedido_items
  where pedido_id = v_pedido_id;

  update pedidos
  set total_articulos = v_total_articulos,
      total_pedido = v_total_articulos
  where id = v_pedido_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_recalcular_totales_pedido
  after insert or update or delete on pedido_items
  for each row
  execute function recalcular_totales_pedido();

-- ── TRIGGER: abonos_pedido → recalcula total_abonado del pedido ────────
-- Los abonos suman, los reembolsos (tipo='reembolso') restan.
create or replace function recalcular_abonado_pedido()
returns trigger
language plpgsql
as $$
declare
  v_pedido_id uuid;
  v_total_abonado numeric(10,2);
begin
  v_pedido_id := coalesce(new.pedido_id, old.pedido_id);

  select coalesce(sum(case when tipo = 'reembolso' then -monto else monto end), 0)
    into v_total_abonado
  from abonos_pedido
  where pedido_id = v_pedido_id;

  update pedidos
  set total_abonado = v_total_abonado
  where id = v_pedido_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_recalcular_abonado_pedido
  after insert or update or delete on abonos_pedido
  for each row
  execute function recalcular_abonado_pedido();

-- ── TRIGGER: abono nuevo → ingreso / reembolso / canje de premio ───────
-- Solo en INSERT (a diferencia del trigger anterior): estos efectos no son
-- reversibles, así que no deben repetirse si el abono se edita o borra.
--   - premio_id no nulo: canje de premio como descuento. Solo marca el
--     premio como canjeado (lo que dispara registrar_egreso_premio_canjeado);
--     no genera ingreso ni vuelve a acumular stickers (evitaría un ciclo).
--   - tipo='reembolso': dinero que se devuelve al cliente (p.ej. artículo
--     defectuoso). Genera un egreso, no toca stickers.
--   - resto: abono normal en efectivo/tarjeta/transferencia.
create or replace function procesar_abono_pedido()
returns trigger
language plpgsql
as $$
declare
  v_cliente_id uuid;
begin
  if new.premio_id is not null then
    update premios_stickers
    set estado_canje = 'canjeado', fecha_canjeado = now()
    where id = new.premio_id
      and estado_canje = 'disponible';

    return new;
  end if;

  if new.tipo = 'reembolso' then
    insert into transacciones (tipo, monto, categoria)
    values ('egreso', new.monto, 'reembolso_pedido');

    return new;
  end if;

  select cliente_id into v_cliente_id from pedidos where id = new.pedido_id;

  insert into transacciones (tipo, monto, categoria)
  values ('ingreso', new.monto, 'abono_pedido');

  if v_cliente_id is not null then
    perform acumular_monto_cliente(v_cliente_id, new.monto);
  end if;

  return new;
end;
$$;

create trigger trg_procesar_abono_pedido
  after insert on abonos_pedido
  for each row
  execute function procesar_abono_pedido();

-- ── TRIGGER: premio canjeado → egreso (salvo cubierto por cupón) ───────
create or replace function registrar_egreso_premio_canjeado()
returns trigger
language plpgsql
as $$
begin
  if new.estado_canje = 'canjeado' and old.estado_canje is distinct from 'canjeado' and not new.cubierto_por_cupon then
    insert into transacciones (tipo, monto, categoria)
    values ('egreso', new.premio_monto, 'premio_sticker');
  end if;

  return new;
end;
$$;

create trigger trg_registrar_egreso_premio_canjeado
  after update on premios_stickers
  for each row
  execute function registrar_egreso_premio_canjeado();
