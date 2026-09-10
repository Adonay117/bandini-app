-- 0007_merma_inventario.sql
-- Flujo de "producto dañado" (merma): cuando un producto ya no se puede
-- vender (se rompió, venció, etc.) se descuenta del stock igual que una
-- venta, pero NO es una venta — se distingue guardando `motivo` (las
-- salidas por venta dejan `motivo` en null y sí traen `venta_id`).
-- Además, a diferencia de abastecer (que no toca Transacciones), reportar
-- una merma sí genera un egreso automático por el costo perdido
-- (cantidad × precio_costo), porque es dinero de inversión que no se va a
-- recuperar con una venta.

alter table movimientos_inventario
  add column motivo text check (motivo in ('danado', 'vencido', 'roto', 'otro'));

create or replace function reportar_merma_producto(
  p_producto_id uuid,
  p_cantidad int,
  p_motivo text,
  p_nota text default null
)
returns void
language plpgsql
as $$
declare
  v_stock int;
  v_costo numeric(10,2);
begin
  if p_cantidad <= 0 then
    raise exception 'La cantidad dañada debe ser mayor a 0';
  end if;
  if p_motivo is null or p_motivo not in ('danado', 'vencido', 'roto', 'otro') then
    raise exception 'Motivo inválido';
  end if;

  select stock_actual, precio_costo into v_stock, v_costo
  from productos where id = p_producto_id for update;

  if v_stock is null then
    raise exception 'Producto no encontrado';
  end if;
  if p_cantidad > v_stock then
    raise exception 'La cantidad dañada no puede ser mayor al stock actual (%)', v_stock;
  end if;

  insert into movimientos_inventario (producto_id, tipo, cantidad, motivo, nota)
  values (p_producto_id, 'salida', p_cantidad, p_motivo, p_nota);

  update productos
  set stock_actual = stock_actual - p_cantidad
  where id = p_producto_id;

  insert into transacciones (tipo, monto, categoria)
  values ('egreso', p_cantidad * v_costo, 'merma');
end;
$$;
