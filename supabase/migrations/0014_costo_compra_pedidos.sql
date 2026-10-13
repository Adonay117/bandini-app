-- ══════════════════════════════════════════════════════════════════════
-- 0014 · Costo de compra de pedidos como egreso real
-- ══════════════════════════════════════════════════════════════════════
-- Hasta ahora lo que se pagaba en la plataforma (Shein, Temu, Amazon…) por
-- los productos de un pedido no se asentaba en `transacciones`: el balance
-- del dashboard solo restaba el costo de embarque, así que la ganancia salía
-- inflada (venta − envío, sin restar la compra).
--
-- Ahora, igual que el costo de embarque, cada producto asienta su costo de
-- compra como egreso cuando se compra, y cada cambio posterior (precio,
-- cantidad, vuelve a "por comprar", no disponible, se borra) asienta la
-- diferencia. Lo que la plataforma reembolsa en una devolución entra como
-- ingreso. Con eso: balance = lo cobrado − lo pagado en la app − el envío.

-- Lo que ya se asentó por este producto; el trigger compara contra esto
-- para asentar solo diferencias.
alter table pedido_items
  add column costo_asentado numeric(10,2) not null default 0;

-- Un producto cuenta como comprado en cualquier estado salvo "por comprar"
-- y "no disponible". Un desistido conserva lo que ya tenía asentado: si se
-- había comprado, esa plata ya salió; si no, nunca salió.
create or replace function trg_pedido_items_costo_compra()
returns trigger
language plpgsql
as $$
declare
  v_objetivo numeric(10,2);
  v_delta numeric(10,2);
begin
  if tg_op = 'DELETE' then
    v_delta := -old.costo_asentado;
  else
    v_objetivo := case
      when new.estado_item in ('pendiente', 'no_disponible') then 0
      when new.estado_item = 'desistido' then coalesce(old.costo_asentado, 0)
      else coalesce(new.precio_compra, 0) * new.cantidad
    end;
    v_delta := v_objetivo - coalesce(old.costo_asentado, 0);
    new.costo_asentado := v_objetivo;
  end if;

  if v_delta > 0 then
    insert into transacciones (tipo, monto, categoria) values ('egreso', v_delta, 'compra_pedido');
  elsif v_delta < 0 then
    insert into transacciones (tipo, monto, categoria) values ('ingreso', -v_delta, 'ajuste_compra_pedido');
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger trg_pedido_items_costo_compra
  before insert or update of estado_item, precio_compra, cantidad or delete on pedido_items
  for each row execute function trg_pedido_items_costo_compra();

-- Reembolso de la plataforma al cerrar una devolución: plata que vuelve.
create or replace function trg_devoluciones_reembolso_plataforma()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'completada'
     and new.resolucion = 'reembolso'
     and coalesce(new.monto_reembolso, 0) > 0
     and old.estado is distinct from 'completada' then
    insert into transacciones (tipo, monto, categoria)
    values ('ingreso', new.monto_reembolso, 'reembolso_plataforma');
  end if;
  return null;
end;
$$;

create trigger trg_devoluciones_reembolso_plataforma
  after update of estado on devoluciones
  for each row execute function trg_devoluciones_reembolso_plataforma();

-- ── Backfill ────────────────────────────────────────────────────────────
-- Asienta la compra de los productos ya comprados, fechada el día de compra
-- del pedido (o cuando se agregó el producto, si no hay fecha de compra).
with comprados as (
  select pi.id,
         coalesce(pi.precio_compra, 0) * pi.cantidad as costo,
         coalesce(p.fecha_compra::timestamptz + interval '12 hours', pi.fecha_creacion) as fecha
  from pedido_items pi
  join pedidos p on p.id = pi.pedido_id
  where pi.estado_item not in ('pendiente', 'no_disponible')
    and coalesce(pi.precio_compra, 0) * pi.cantidad > 0
),
asentar as (
  insert into transacciones (tipo, monto, categoria, fecha)
  select 'egreso', costo, 'compra_pedido', fecha from comprados
)
update pedido_items pi
set costo_asentado = c.costo
from comprados c
where c.id = pi.id;

-- Reembolsos de plataforma ya cerrados.
insert into transacciones (tipo, monto, categoria, fecha)
select 'ingreso', d.monto_reembolso, 'reembolso_plataforma', coalesce(d.fecha_resolucion, now())
from devoluciones d
where d.estado = 'completada' and d.resolucion = 'reembolso' and coalesce(d.monto_reembolso, 0) > 0;
