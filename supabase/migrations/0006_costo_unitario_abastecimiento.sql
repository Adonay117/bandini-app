-- 0006_costo_unitario_abastecimiento.sql
-- Al abastecer inventario, el proveedor a veces cambia el precio (más caro
-- o más barato que la última vez). Se permite registrar el costo unitario
-- pagado en esa entrada: queda de histórico en el movimiento y, si se
-- indica, actualiza productos.precio_costo para que el costo "actual" del
-- producto refleje lo último pagado.

alter table movimientos_inventario
  add column costo_unitario numeric(10,2) check (costo_unitario >= 0);

create or replace function abastecer_producto(
  p_producto_id uuid,
  p_cantidad int,
  p_nota text default null,
  p_costo_unitario numeric default null
)
returns void
language plpgsql
as $$
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad a abastecer debe ser mayor a 0';
  end if;
  if p_costo_unitario is not null and p_costo_unitario < 0 then
    raise exception 'El costo unitario no puede ser negativo';
  end if;

  insert into movimientos_inventario (producto_id, tipo, cantidad, nota, costo_unitario)
  values (p_producto_id, 'entrada', p_cantidad, p_nota, p_costo_unitario);

  update productos
  set stock_actual = stock_actual + p_cantidad,
      precio_costo = coalesce(p_costo_unitario, precio_costo)
  where id = p_producto_id;
end;
$$;
