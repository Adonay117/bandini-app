-- 0005_abastecer_inventario.sql
-- Flujo de abastecimiento de inventario: registrar una entrada de stock
-- para un producto (compra a proveedor, reposición, etc). A diferencia de
-- editar `stock_actual` a mano, esto siempre queda registrado en
-- movimientos_inventario (ver /api/productos/[id]/movimientos).

alter table movimientos_inventario
  add column nota text;

create or replace function abastecer_producto(p_producto_id uuid, p_cantidad int, p_nota text default null)
returns void
language plpgsql
as $$
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad a abastecer debe ser mayor a 0';
  end if;

  insert into movimientos_inventario (producto_id, tipo, cantidad, nota)
  values (p_producto_id, 'entrada', p_cantidad, p_nota);

  update productos
  set stock_actual = stock_actual + p_cantidad
  where id = p_producto_id;
end;
$$;
