-- 0015_egreso_abastecimiento.sql
-- Abastecer inventario es una compra al proveedor: el dinero sale, así que
-- debe asentarse como egreso en `transacciones` (antes solo movía stock y el
-- balance no lo reflejaba). Monto = cantidad × costo unitario pagado; si no se
-- indica costo, se usa el precio_costo vigente del producto.

create or replace function abastecer_producto(
  p_producto_id uuid,
  p_cantidad int,
  p_nota text default null,
  p_costo_unitario numeric default null
)
returns void
language plpgsql
as $$
declare
  v_costo numeric(10,2);
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad a abastecer debe ser mayor a 0';
  end if;
  if p_costo_unitario is not null and p_costo_unitario < 0 then
    raise exception 'El costo unitario no puede ser negativo';
  end if;

  select precio_costo into v_costo
  from productos where id = p_producto_id for update;

  if not found then
    raise exception 'Producto no encontrado';
  end if;

  insert into movimientos_inventario (producto_id, tipo, cantidad, nota, costo_unitario)
  values (p_producto_id, 'entrada', p_cantidad, p_nota, p_costo_unitario);

  update productos
  set stock_actual = stock_actual + p_cantidad,
      precio_costo = coalesce(p_costo_unitario, precio_costo)
  where id = p_producto_id;

  if p_cantidad * coalesce(p_costo_unitario, v_costo, 0) > 0 then
    insert into transacciones (tipo, monto, categoria)
    values ('egreso', p_cantidad * coalesce(p_costo_unitario, v_costo), 'abastecimiento');
  end if;
end;
$$;
