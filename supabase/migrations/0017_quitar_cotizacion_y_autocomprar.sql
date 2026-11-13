-- Simplifica el flujo de pedidos:
--  1) Se elimina el estado 'cotizacion'. Un pedido nuevo arranca en 'confirmado'
--     y los existentes en cotización pasan a 'confirmado'.
--  2) Automatización: cuando ya no queda ningún producto por comprar (todos
--     'comprado' o 'no_disponible', con al menos uno 'comprado'), el pedido
--     pasa solo de 'confirmado' a 'comprado' (y fija fecha_compra). Si se
--     revierte un producto a 'pendiente' (o entra uno nuevo) y el pedido aún no
--     tiene movimiento logístico, vuelve a 'confirmado'.

-- ── 1. Quitar cotización ──────────────────────────────────────────────
alter table pedidos drop constraint pedidos_estado_check;
update pedidos set estado = 'confirmado' where estado = 'cotizacion';
alter table pedidos add constraint pedidos_estado_check check (estado in (
  'confirmado', 'comprado', 'en_transito', 'recibido_parcial', 'recibido',
  'listo_entrega', 'entregado_parcial', 'entregado', 'completado',
  'desistido', 'cancelado'
));
alter table pedidos alter column estado set default 'confirmado';

-- ── 2. Auto-avance confirmado <-> comprado ────────────────────────────
create or replace function sincronizar_compra_pedido(p_pedido_id uuid)
returns void
language plpgsql
as $$
declare
  v_actual text;
  v_pendientes int;
  v_comprados int;
  v_otros int;
begin
  select estado into v_actual from pedidos where id = p_pedido_id for update;
  if v_actual is null or v_actual not in ('confirmado', 'comprado') then
    return;
  end if;

  select
    count(*) filter (where estado_item = 'pendiente'),
    count(*) filter (where estado_item = 'comprado'),
    count(*) filter (where estado_item not in ('pendiente', 'comprado', 'no_disponible'))
  into v_pendientes, v_comprados, v_otros
  from pedido_items
  where pedido_id = p_pedido_id;

  if v_actual = 'confirmado' and v_pendientes = 0 and v_comprados > 0 then
    update pedidos
       set estado = 'comprado',
           fecha_compra = coalesce(fecha_compra, current_date)
     where id = p_pedido_id;
  elsif v_actual = 'comprado' and v_pendientes > 0 and v_otros = 0 then
    -- Se revirtió/agregó un producto por comprar y nada ha viajado todavía.
    update pedidos set estado = 'confirmado' where id = p_pedido_id;
  end if;
end;
$$;

create or replace function trg_pedido_items_sincronizar_compra()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform sincronizar_compra_pedido(old.pedido_id);
  else
    perform sincronizar_compra_pedido(new.pedido_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_pedido_items_sincronizar_compra on pedido_items;
create trigger trg_pedido_items_sincronizar_compra
  after insert or delete or update of estado_item on pedido_items
  for each row execute function trg_pedido_items_sincronizar_compra();

-- Backfill: pedidos confirmados que ya no tienen productos por comprar.
select sincronizar_compra_pedido(id) from pedidos where estado = 'confirmado';
