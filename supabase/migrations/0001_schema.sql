-- 0001_schema.sql
-- Esquema base consolidado (estado final): las 10 tablas del negocio de
-- cosméticos, ya con todos los cambios acumulados desde el primer diseño
-- (imagen de producto, departamento/lugar de cliente, pedidos sin costo de
-- envío, artículos de pedido defectuosos, reembolsos y premios cubiertos
-- por cupón del proveedor). Este archivo reemplaza el historial incremental
-- de migraciones anteriores; no hace falta volver a correrlo si la base de
-- datos ya está al día.

create extension if not exists "pgcrypto";

-- ── clientes ────────────────────────────────────────────────────────────
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null unique,
  email text,
  fecha_nacimiento date,
  departamento text,
  lugar text,
  monto_acumulado_tarjeta numeric(10,2) not null default 0 check (monto_acumulado_tarjeta >= 0),
  stickers_actuales int not null default 0 check (stickers_actuales >= 0),
  total_moneda_gastada numeric(10,2) not null default 0 check (total_moneda_gastada >= 0),
  total_tarjetas_completadas int not null default 0,
  total_premios_ganados int not null default 0,
  acepta_notificaciones boolean not null default true,
  fecha_registro timestamptz not null default now(),
  activo boolean not null default true
);

-- ── productos ───────────────────────────────────────────────────────────
create table productos (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  nombre text not null,
  categoria text,
  precio_costo numeric(10,2) not null check (precio_costo >= 0),
  precio_venta numeric(10,2) not null check (precio_venta >= 0),
  stock_actual int not null default 0 check (stock_actual >= 0),
  stock_minimo int not null default 0 check (stock_minimo >= 0),
  imagen_url text,
  activo boolean not null default true,
  fecha_creacion timestamptz not null default now()
);

-- ── ventas ──────────────────────────────────────────────────────────────
create table ventas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  producto_id uuid not null references productos(id),
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario > 0),
  descuento numeric(10,2) not null default 0 check (descuento >= 0),
  total numeric(10,2) not null check (total > 0),
  metodo_pago text check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia')),
  fecha timestamptz not null default now()
);

create index ventas_cliente_id_idx on ventas(cliente_id);
create index ventas_producto_id_idx on ventas(producto_id);
create index ventas_fecha_idx on ventas(fecha desc);

-- ── premios_stickers ────────────────────────────────────────────────────
create table premios_stickers (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  stickers_alcanzados int not null check (stickers_alcanzados in (5, 10)),
  premio_monto numeric(10,2) not null check (premio_monto in (12, 25)),
  monto_acumulado_cuando_gano numeric(10,2) not null,
  estado_canje text not null default 'disponible' check (estado_canje in ('disponible', 'canjeado', 'expirado')),
  -- true cuando el canje lo cubre un cupón del proveedor (Temu/Shein) y no
  -- sale dinero real de Bandini; en ese caso no se registra egreso.
  cubierto_por_cupon boolean not null default false,
  fecha_ganado timestamptz not null default now(),
  fecha_canjeado timestamptz
);

create index premios_stickers_cliente_id_idx on premios_stickers(cliente_id);

-- ── notificaciones_admin ────────────────────────────────────────────────
create table notificaciones_admin (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  -- 'estado_pedido' queda solo como valor histórico: ya no se generan filas
  -- nuevas de ese tipo (ver notas del archivo de triggers).
  tipo text not null check (tipo in ('cumpleanos', 'sticker_ganado', 'estado_pedido', 'item_no_disponible')),
  asunto text not null,
  cuerpo_mensaje text not null,
  visto boolean not null default false,
  fecha_creacion timestamptz not null default now(),
  fecha_leido timestamptz
);

create index notificaciones_admin_visto_idx on notificaciones_admin(visto);
create index notificaciones_admin_cliente_id_idx on notificaciones_admin(cliente_id);

-- ── pedidos ─────────────────────────────────────────────────────────────
-- total_articulos, total_pedido y total_abonado se recalculan
-- automáticamente por triggers (ver 0002_triggers.sql) a partir de
-- pedido_items y abonos_pedido; nunca se escriben a mano desde la API.
create sequence pedidos_numero_seq start 1;

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  numero int not null default nextval('pedidos_numero_seq') unique,
  cliente_id uuid not null references clientes(id),
  estado text not null default 'cotizacion' check (estado in ('cotizacion', 'confirmado', 'en_transito', 'entregado', 'completado')),
  total_articulos numeric(10,2) not null default 0 check (total_articulos >= 0),
  total_pedido numeric(10,2) not null default 0 check (total_pedido >= 0),
  total_abonado numeric(10,2) not null default 0 check (total_abonado >= 0),
  saldo_pendiente numeric(10,2) generated always as (total_pedido - total_abonado) stored,
  fecha_creacion timestamptz not null default now()
);

create index pedidos_cliente_id_idx on pedidos(cliente_id);

-- ── pedido_items ────────────────────────────────────────────────────────
-- Artículos comprados en plataformas externas (Shein/Temu/Amazon) para un
-- pedido de un cliente; no están ligados al inventario propio (productos).
-- `url` es el link opcional al artículo original. `defectuoso` marca un
-- artículo pendiente de resolver (cambio, reembolso total o parcial — ver
-- /api/pedidos/[id]/items/[itemId]/defecto).
create table pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  plataforma text not null,
  producto text not null,
  precio numeric(10,2) not null check (precio >= 0),
  url text,
  imagen_url text,
  estado_item text not null default 'pendiente' check (estado_item in ('pendiente', 'comprado', 'no_disponible', 'entregado', 'defectuoso'))
);

create index pedido_items_pedido_id_idx on pedido_items(pedido_id);

-- ── abonos_pedido ───────────────────────────────────────────────────────
-- tipo='abono' es un pago normal del cliente; tipo='reembolso' es dinero
-- que se le devuelve (resta de total_abonado en vez de sumar — ver
-- recalcular_abonado_pedido). premio_id, cuando no es null, indica que la
-- fila es el canje de un premio de sticker como descuento (no genera
-- ingreso ni vuelve a acumular stickers).
create table abonos_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  monto numeric(10,2) not null check (monto > 0),
  tipo text not null default 'abono' check (tipo in ('abono', 'reembolso')),
  premio_id uuid references premios_stickers(id),
  fecha_abono timestamptz not null default now(),
  metodo_pago text check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia'))
);

create index abonos_pedido_pedido_id_idx on abonos_pedido(pedido_id);

-- ── movimientos_inventario ──────────────────────────────────────────────
create table movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id),
  tipo text not null check (tipo in ('entrada', 'salida')),
  cantidad int not null check (cantidad > 0),
  venta_id uuid references ventas(id),
  fecha timestamptz not null default now()
);

create index movimientos_inventario_producto_id_idx on movimientos_inventario(producto_id);

-- ── transacciones ───────────────────────────────────────────────────────
-- Se alimenta sola: ventas, abonos y reembolsos insertan ingreso/egreso
-- automáticamente, y canjear un premio de sticker (sin cupón de proveedor)
-- inserta egreso automáticamente (triggers en 0002_triggers.sql). También
-- admite registros manuales desde la UI de Ingresos y Egresos.
create table transacciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  monto numeric(10,2) not null check (monto > 0),
  categoria text,
  fecha timestamptz not null default now()
);

create index transacciones_fecha_idx on transacciones(fecha desc);
