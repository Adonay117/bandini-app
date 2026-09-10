-- 0008_fix_reembolso_item.sql
-- Bug: un reembolso (total o parcial) de un artículo defectuoso restaba el
-- monto directamente de pedido_items.precio. Si ese artículo se volvía a
-- editar después (Editar artículo o Cambio de producto), la edición
-- sobreescribía el precio sin saber que ya traía un reembolso aplicado,
-- borrando el descuento de total_pedido mientras el abono de reembolso
-- seguía restando de total_abonado — el saldo pendiente quedaba inflado
-- permanentemente.
--
-- Fix: el monto reembolsado se lleva aparte en `monto_reembolsado` y se
-- resta siempre al calcular total_pedido, sin importar qué valor tenga
-- `precio` en cualquier momento posterior.

alter table pedido_items
  add column monto_reembolsado numeric(10,2) not null default 0 check (monto_reembolsado >= 0);

create or replace function recalcular_totales_pedido()
returns trigger
language plpgsql
as $$
declare
  v_pedido_id uuid;
  v_total_articulos numeric(10,2);
begin
  v_pedido_id := coalesce(new.pedido_id, old.pedido_id);

  select coalesce(sum(precio - monto_reembolsado), 0)
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
