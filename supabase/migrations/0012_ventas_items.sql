-- Convierte "ventas" en cabecera de venta y mueve el detalle por producto a
-- venta_items, para que un checkout con varios productos sea UNA sola venta
-- (antes cada línea del carrito se insertaba como una fila independiente en
-- "ventas", como si fueran ventas separadas).

create table venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas(id) on delete cascade,
  producto_id uuid not null references productos(id),
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario > 0),
  descuento numeric(10,2) not null default 0 check (descuento >= 0),
  total numeric(10,2) not null check (total > 0)
);

create index venta_items_venta_id_idx on venta_items(venta_id);
create index venta_items_producto_id_idx on venta_items(producto_id);

alter table venta_items enable row level security;
create policy "authenticated_all" on venta_items for all to authenticated using (true) with check (true);

-- Migra las filas existentes: cada venta actual se vuelve su propio item,
-- conservando el mismo id de cabecera para no romper movimientos_inventario.venta_id.
insert into venta_items (venta_id, producto_id, cantidad, precio_unitario, descuento, total)
select id, producto_id, cantidad, precio_unitario, descuento, total
from ventas;

-- La cabecera deja de tener datos de producto: eso ahora vive en venta_items.
alter table ventas
  drop column producto_id,
  drop column cantidad,
  drop column precio_unitario,
  drop column descuento;

-- El trigger anterior operaba sobre una fila de "ventas" que en realidad era
-- una línea de producto. Ahora el stock se descuenta por venta_items (una vez
-- por línea) y el ingreso/stickers se registran una sola vez por venta
-- (cabecera), no una vez por línea.
drop trigger trg_registrar_venta_con_stickers on ventas;
drop function registrar_venta_con_stickers();

create function descontar_stock_venta_item()
returns trigger
language plpgsql
as $$
begin
  insert into movimientos_inventario (producto_id, tipo, cantidad, venta_id)
  values (new.producto_id, 'salida', new.cantidad, new.venta_id);

  update productos
  set stock_actual = stock_actual - new.cantidad
  where id = new.producto_id;

  return new;
end;
$$;

create trigger trg_descontar_stock_venta_item
  after insert on venta_items
  for each row
  execute function descontar_stock_venta_item();

create function registrar_ingreso_venta()
returns trigger
language plpgsql
as $$
begin
  insert into transacciones (tipo, monto, categoria)
  values ('ingreso', new.total, 'venta');

  if new.cliente_id is not null then
    perform acumular_monto_cliente(new.cliente_id, new.total);
  end if;

  return new;
end;
$$;

create trigger trg_registrar_ingreso_venta
  after insert on ventas
  for each row
  execute function registrar_ingreso_venta();

-- Crea la cabecera y sus líneas en una sola transacción: si una línea falla
-- (p. ej. una carrera de stock hace que descontar_stock_venta_item la
-- rechace), toda la venta se revierte, incluyendo el ingreso/stickers que ya
-- había disparado el insert de la cabecera. Reemplaza los dos inserts
-- separados que haría la API, que ya no serían atómicos entre sí.
create function crear_venta(p_cliente_id uuid, p_metodo_pago text, p_items jsonb)
returns ventas
language plpgsql
as $$
declare
  v_venta ventas;
  v_total numeric(10,2);
begin
  select coalesce(sum((it->>'total')::numeric), 0) into v_total
  from jsonb_array_elements(p_items) it;

  insert into ventas (cliente_id, metodo_pago, total)
  values (p_cliente_id, p_metodo_pago, v_total)
  returning * into v_venta;

  insert into venta_items (venta_id, producto_id, cantidad, precio_unitario, descuento, total)
  select
    v_venta.id,
    (it->>'producto_id')::uuid,
    (it->>'cantidad')::int,
    (it->>'precio_unitario')::numeric,
    (it->>'descuento')::numeric,
    (it->>'total')::numeric
  from jsonb_array_elements(p_items) it;

  return v_venta;
end;
$$;
