-- 0013_logistica.sql
-- Módulo de Envíos / Logística.
--
-- Flujo: Cotización → Abono → Pedido → Compra en plataforma → Embarque →
-- Recepción → Incidencias / Devoluciones → Clasificación → Entrega →
-- Pedido completado.
--
-- Modelo (sin duplicar información):
--
--   pedidos 1─N pedido_items ─┬─N embarque_items N─1 embarques
--                             │        │ 1─N incidencias 1─N devoluciones 1─1 reposiciones
--                             │        └─ reposicion_id ──────────────────────────┘ (la reposición
--                             │           viaja en un embarque nuevo, ligada al MISMO pedido_item)
--                             └─N entrega_items N─1 entregas N─1 pedidos
--
-- Las cantidades por producto (embarcada, recibida, entregada, reembolsada
-- por la plataforma…) NO se guardan en pedido_items: se derivan en la vista
-- v_pedido_items_logistica. pedido_items.estado_item y pedidos.estado sí se
-- guardan (para filtrar/listar rápido), pero los recalculan las funciones
-- recalcular_estado_item() y sincronizar_estado_pedido() a partir de esas
-- cantidades; la API nunca los escribe a mano salvo los estados manuales
-- (pendiente, comprado, no_disponible, cotización, confirmado, listo para
-- entrega, completado, desistido, cancelado).
--
-- Reglas financieras:
--   - El costo de un embarque es un egreso real del negocio (se asienta en
--     transacciones) y se reparte entre las líneas RECIBIDAS del embarque
--     por peso (o por unidades si alguna línea no tiene peso). Mientras el
--     embarque no se recibe, se estima con la cantidad esperada.
--   - Ganancia real = ventas − costo de productos − costo de importación.
--   - Reembolso de la plataforma: resta del costo de productos del artículo.
--   - Reposición: el costo del producto se conserva (no se vuelve a sumar);
--     el embarque nuevo suma su propio costo de importación al mismo artículo.
--   - Encomienda: lo que el cliente le paga a la encomendista no entra en
--     ingresos ni costos del negocio; aquí solo se registra quién y dónde.

-- ══════════════════════════════════════════════════════════════════════
-- 1. PEDIDOS: una sola plataforma, estados ampliados, desistimiento
-- ══════════════════════════════════════════════════════════════════════

alter table pedidos
  add column plataforma text check (plataforma in ('SHEIN', 'TEMU', 'AMAZON')),
  add column referencia_compra text,
  add column fecha_compra date,
  add column desistido_at timestamptz,
  add column motivo_desistimiento text,
  add column nota text;

-- Backfill: la plataforma dominante de sus artículos. Los pedidos viejos
-- con varias plataformas (o con texto libre que no es SHEIN/TEMU/AMAZON)
-- quedan con la dominante o en null; la plataforma original de cada
-- artículo se conserva en pedido_items.plataforma_origen.
update pedidos p
set plataforma = sub.plat
from (
  select pedido_id,
         upper(trim(plataforma)) as plat,
         row_number() over (partition by pedido_id order by count(*) desc, sum(precio) desc) as rn
  from pedido_items
  where upper(trim(plataforma)) in ('SHEIN', 'TEMU', 'AMAZON')
  group by pedido_id, upper(trim(plataforma))
) sub
where sub.pedido_id = p.id and sub.rn = 1;

alter table pedidos drop constraint pedidos_estado_check;
alter table pedidos add constraint pedidos_estado_check check (estado in (
  'cotizacion',        -- se arma la cotización
  'confirmado',        -- el cliente abonó / confirmó
  'comprado',          -- se compró en la plataforma
  'en_transito',       -- al menos un producto viaja en un embarque (automático)
  'recibido_parcial',  -- automático
  'recibido',          -- automático: todo lo vigente llegó bien
  'listo_entrega',     -- clasificado, listo para entregar (manual)
  'entregado_parcial', -- automático
  'entregado',         -- automático
  'completado',        -- cerrado (manual)
  'desistido',         -- el cliente ya no quiere / no retira (conserva pagos y productos)
  'cancelado'
));

-- Estado de pago derivado: nunca se escribe, sale de los totales.
alter table pedidos add column estado_pago text generated always as (
  case
    when total_abonado <= 0 then 'pendiente'
    when total_abonado < total_pedido then 'parcial'
    when total_abonado = total_pedido then 'pagado'
    else 'a_favor'
  end
) stored;

create index pedidos_estado_idx on pedidos(estado);

-- ══════════════════════════════════════════════════════════════════════
-- 2. PEDIDO_ITEMS → productos del pedido
-- ══════════════════════════════════════════════════════════════════════

alter table pedido_items rename column producto to nombre;
alter table pedido_items rename column precio to precio_venta; -- unitario
alter table pedido_items rename column plataforma to plataforma_origen;
alter table pedido_items alter column plataforma_origen drop not null;
comment on column pedido_items.plataforma_origen is
  'Legado: plataforma por artículo de antes de 0013. La plataforma vive ahora en pedidos.plataforma.';

alter table pedido_items
  add column cantidad int not null default 1 check (cantidad > 0),
  add column precio_compra numeric(10,2) check (precio_compra >= 0), -- unitario, en la plataforma
  add column peso_lb numeric(10,3) check (peso_lb >= 0),              -- unitario
  add column desistido_at timestamptz,
  add column fecha_creacion timestamptz not null default now();

alter table pedido_items drop constraint pedido_items_estado_item_check;
alter table pedido_items add constraint pedido_items_estado_item_check check (estado_item in (
  -- manuales
  'pendiente', 'comprado', 'no_disponible',
  -- automáticos (recalcular_estado_item)
  'en_transito', 'recibido_parcial', 'recibido', 'con_incidencia', 'en_devolucion',
  'pendiente_reposicion', 'reembolsado', 'entregado_parcial', 'entregado', 'desistido',
  -- legado: defecto resuelto directo con el cliente (sin embarque registrado)
  'defectuoso'
));

create or replace function recalcular_totales_pedido()
returns trigger
language plpgsql
as $$
declare
  v_pedido_id uuid;
  v_total_articulos numeric(10,2);
begin
  v_pedido_id := coalesce(new.pedido_id, old.pedido_id);

  select coalesce(sum(precio_venta * cantidad - monto_reembolsado), 0)
    into v_total_articulos
  from pedido_items
  where pedido_id = v_pedido_id;

  update pedidos
  set total_articulos = v_total_articulos,
      total_pedido = v_total_articulos
  where id = v_pedido_id
    and (total_articulos, total_pedido) is distinct from (v_total_articulos, v_total_articulos);

  return coalesce(new, old);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. EMBARQUES
-- ══════════════════════════════════════════════════════════════════════

create sequence embarques_numero_seq start 1;

create table embarques (
  id uuid primary key default gen_random_uuid(),
  numero int not null default nextval('embarques_numero_seq') unique,
  guia text,
  paqueteria text not null,
  fecha_envio date not null default current_date,
  -- lo que cobró la paquetería por traer el paquete a El Salvador
  costo_total numeric(10,2) not null default 0 check (costo_total >= 0),
  estado text not null default 'en_transito'
    check (estado in ('en_transito', 'recibido_parcial', 'con_incidencias', 'recibido')),
  fecha_recepcion timestamptz,
  nota text,
  fecha_creacion timestamptz not null default now()
);

-- Una línea = un producto de un pedido dentro de un embarque (un embarque
-- mezcla productos de varios pedidos; un producto se reparte en varios
-- embarques). La recepción se registra por línea.
create table embarque_items (
  id uuid primary key default gen_random_uuid(),
  embarque_id uuid not null references embarques(id) on delete cascade,
  pedido_item_id uuid not null references pedido_items(id),
  reposicion_id uuid, -- FK agregada abajo (la tabla se crea después)
  cantidad_esperada int not null check (cantidad_esperada > 0),
  cantidad_recibida int check (cantidad_recibida >= 0),
  cantidad_ok int check (cantidad_ok >= 0),
  fecha_recepcion timestamptz,
  nota_recepcion text,
  estado_recepcion text generated always as (
    case
      when cantidad_recibida is null then 'pendiente'
      when cantidad_ok = cantidad_esperada then 'correcto'
      when cantidad_recibida = 0 then 'faltante'
      when cantidad_ok = cantidad_recibida then 'incompleto'
      else 'con_incidencia'
    end
  ) stored,
  check (cantidad_recibida is null or cantidad_recibida <= cantidad_esperada),
  check ((cantidad_recibida is null) = (cantidad_ok is null)),
  check (cantidad_ok is null or cantidad_ok <= cantidad_recibida),
  unique nulls not distinct (embarque_id, pedido_item_id, reposicion_id)
);

create index embarque_items_embarque_id_idx on embarque_items(embarque_id);
create index embarque_items_pedido_item_id_idx on embarque_items(pedido_item_id);

-- ══════════════════════════════════════════════════════════════════════
-- 4. INCIDENCIAS, DEVOLUCIONES A PLATAFORMA, REPOSICIONES
-- ══════════════════════════════════════════════════════════════════════

create table incidencias (
  id uuid primary key default gen_random_uuid(),
  embarque_item_id uuid not null references embarque_items(id) on delete cascade,
  tipo text not null check (tipo in ('faltante', 'incompleto', 'danado', 'equivocado')),
  cantidad int not null check (cantidad > 0),
  descripcion text,
  -- abierta → en_reclamo (hay devolución activa) → resuelta
  -- absorbida = el negocio asume la pérdida sin reclamar
  estado text not null default 'abierta' check (estado in ('abierta', 'en_reclamo', 'resuelta', 'absorbida')),
  fecha timestamptz not null default now(),
  fecha_resolucion timestamptz
);

create index incidencias_embarque_item_id_idx on incidencias(embarque_item_id);

create sequence devoluciones_numero_seq start 1;

create table devoluciones (
  id uuid primary key default gen_random_uuid(),
  numero int not null default nextval('devoluciones_numero_seq') unique,
  incidencia_id uuid not null references incidencias(id) on delete cascade,
  cantidad int not null check (cantidad > 0), -- parcial o total respecto al producto
  resolucion text not null check (resolucion in ('reembolso', 'reposicion')),
  estado text not null default 'solicitada' check (estado in ('solicitada', 'aceptada', 'rechazada', 'completada')),
  referencia text, -- nº de caso / reclamo en la plataforma
  monto_reembolso numeric(10,2) check (monto_reembolso >= 0), -- lo que devolvió la plataforma
  nota text,
  fecha_solicitud timestamptz not null default now(),
  fecha_resolucion timestamptz,
  check (estado <> 'completada' or resolucion <> 'reembolso' or monto_reembolso is not null)
);

create index devoluciones_incidencia_id_idx on devoluciones(incidencia_id);

create table reposiciones (
  id uuid primary key default gen_random_uuid(),
  devolucion_id uuid not null unique references devoluciones(id) on delete cascade,
  cantidad int not null check (cantidad > 0),
  -- pendiente (aún no viene) → en_transito → recibida | con_incidencia
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_transito', 'recibida', 'con_incidencia')),
  fecha_creacion timestamptz not null default now()
);

alter table embarque_items
  add constraint embarque_items_reposicion_id_fkey foreign key (reposicion_id) references reposiciones(id);

-- ══════════════════════════════════════════════════════════════════════
-- 5. ENTREGAS
-- ══════════════════════════════════════════════════════════════════════

create table entregas (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  modalidad text not null check (modalidad in ('punto_propio', 'encomienda')),
  -- solo encomienda; el cobro de la encomendista lo paga el cliente directo
  -- y NO es ingreso ni costo del negocio, por eso no se guarda un monto.
  encomendista text,
  agencia_punto text,
  -- pendiente → enviada (en manos de la encomendista) → entregada
  -- no_retirada = el cliente no llegó / no la recogió; el producto vuelve a quedar disponible
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviada', 'entregada', 'no_retirada')),
  fecha_programada date,
  fecha_entrega timestamptz,
  nota text,
  fecha_creacion timestamptz not null default now(),
  check (modalidad = 'punto_propio' or encomendista is not null)
);

create index entregas_pedido_id_idx on entregas(pedido_id);

create table entrega_items (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references entregas(id) on delete cascade,
  pedido_item_id uuid not null references pedido_items(id),
  cantidad int not null check (cantidad > 0),
  unique (entrega_id, pedido_item_id)
);

create index entrega_items_pedido_item_id_idx on entrega_items(pedido_item_id);

-- ══════════════════════════════════════════════════════════════════════
-- 6. HISTORIAL DE ESTADOS (trazabilidad)
-- ══════════════════════════════════════════════════════════════════════

create table historial_estados (
  id bigint generated always as identity primary key,
  entidad text not null,
  entidad_id uuid not null,
  pedido_id uuid, -- para armar la línea de tiempo de un pedido de un solo query
  estado_anterior text,
  estado_nuevo text not null,
  fecha timestamptz not null default now()
);

create index historial_estados_entidad_idx on historial_estados(entidad, entidad_id);
create index historial_estados_pedido_id_idx on historial_estados(pedido_id);

create or replace function registrar_historial_estado()
returns trigger
language plpgsql
as $$
declare
  v_nuevo text;
  v_anterior text;
  v_pedido_id uuid;
begin
  v_nuevo := to_jsonb(new)->>'estado';
  if v_nuevo is null then
    v_nuevo := to_jsonb(new)->>'estado_item';
  end if;
  if tg_op = 'UPDATE' then
    v_anterior := coalesce(to_jsonb(old)->>'estado', to_jsonb(old)->>'estado_item');
    if v_anterior is not distinct from v_nuevo then
      return new;
    end if;
  end if;

  v_pedido_id := case tg_table_name
    when 'pedidos' then new.id
    when 'pedido_items' then (to_jsonb(new)->>'pedido_id')::uuid
    when 'entregas' then (to_jsonb(new)->>'pedido_id')::uuid
    else null
  end;

  insert into historial_estados (entidad, entidad_id, pedido_id, estado_anterior, estado_nuevo)
  values (tg_table_name, new.id, v_pedido_id, v_anterior, v_nuevo);

  return new;
end;
$$;

create trigger trg_historial_pedidos after insert or update of estado on pedidos
  for each row execute function registrar_historial_estado();
create trigger trg_historial_pedido_items after insert or update of estado_item on pedido_items
  for each row execute function registrar_historial_estado();
create trigger trg_historial_embarques after insert or update of estado on embarques
  for each row execute function registrar_historial_estado();
create trigger trg_historial_incidencias after insert or update of estado on incidencias
  for each row execute function registrar_historial_estado();
create trigger trg_historial_devoluciones after insert or update of estado on devoluciones
  for each row execute function registrar_historial_estado();
create trigger trg_historial_reposiciones after insert or update of estado on reposiciones
  for each row execute function registrar_historial_estado();
create trigger trg_historial_entregas after insert or update of estado on entregas
  for each row execute function registrar_historial_estado();

-- ══════════════════════════════════════════════════════════════════════
-- 7. VISTAS DERIVADAS: cantidades y costos (fuente de verdad)
-- ══════════════════════════════════════════════════════════════════════

-- Costo de importación asignado a cada línea de embarque. Base de reparto:
-- peso × unidades si TODAS las líneas del embarque tienen peso; si no,
-- unidades. Unidades = recibidas (o esperadas mientras no se recibe); las
-- faltantes no cargan costo.
create view v_embarque_items_costo
with (security_invoker = true) as
with base as (
  select
    ei.id as embarque_item_id,
    ei.embarque_id,
    ei.pedido_item_id,
    coalesce(ei.cantidad_recibida, ei.cantidad_esperada) as unidades,
    pi.peso_lb,
    bool_and(coalesce(pi.peso_lb, 0) > 0) over (partition by ei.embarque_id) as todo_con_peso
  from embarque_items ei
  join pedido_items pi on pi.id = ei.pedido_item_id
),
ponderado as (
  select *,
    case when todo_con_peso then unidades * peso_lb else unidades end::numeric as peso_reparto
  from base
)
select
  p.embarque_item_id,
  p.embarque_id,
  p.pedido_item_id,
  p.unidades,
  p.peso_reparto,
  case when p.todo_con_peso then 'peso' else 'unidades' end as metodo_reparto,
  case
    when sum(p.peso_reparto) over (partition by p.embarque_id) > 0
      then round(e.costo_total * p.peso_reparto / sum(p.peso_reparto) over (partition by p.embarque_id), 2)
    else 0
  end as costo_importacion
from ponderado p
join embarques e on e.id = p.embarque_id;

create view v_pedido_items_logistica
with (security_invoker = true) as
select
  pi.id as pedido_item_id,
  pi.pedido_id,
  coalesce(emb.cantidad_embarcada, 0) as cantidad_embarcada,       -- envío original (sin reposiciones)
  coalesce(emb.cantidad_en_transito, 0) as cantidad_en_transito,   -- incluye reposiciones
  coalesce(emb.cantidad_recibida, 0) as cantidad_recibida,
  coalesce(emb.cantidad_ok, 0) as cantidad_ok,                     -- utilizable (incl. reposiciones)
  coalesce(emb.costo_importacion, 0) as costo_importacion,
  coalesce(inc.incidencias_abiertas, 0) as incidencias_abiertas,
  coalesce(inc.cantidad_perdida, 0) as cantidad_perdida,           -- incidencias absorbidas por el negocio
  coalesce(dev.devoluciones_abiertas, 0) as devoluciones_abiertas,
  coalesce(dev.cantidad_reembolsada_plataforma, 0) as cantidad_reembolsada_plataforma,
  coalesce(dev.monto_reembolso_plataforma, 0) as monto_reembolso_plataforma,
  coalesce(rep.reposiciones_pendientes, 0) as reposiciones_pendientes,
  coalesce(ent.cantidad_entregada, 0) as cantidad_entregada,
  coalesce(ent.cantidad_en_entrega, 0) as cantidad_en_entrega,     -- asignada a entregas pendientes/enviadas
  -- Costo del producto: lo pagado en la plataforma menos lo que la
  -- plataforma reembolsó. Un producto no disponible no se compró.
  case when pi.estado_item = 'no_disponible' then 0
       else coalesce(pi.precio_compra, 0) * pi.cantidad - coalesce(dev.monto_reembolso_plataforma, 0)
  end as costo_producto,
  pi.precio_venta * pi.cantidad - pi.monto_reembolsado as venta_neta
from pedido_items pi
left join lateral (
  select
    sum(ei.cantidad_esperada) filter (where ei.reposicion_id is null) as cantidad_embarcada,
    sum(ei.cantidad_esperada) filter (where ei.cantidad_recibida is null) as cantidad_en_transito,
    sum(ei.cantidad_recibida) as cantidad_recibida,
    sum(ei.cantidad_ok) as cantidad_ok,
    sum(c.costo_importacion) as costo_importacion
  from embarque_items ei
  join v_embarque_items_costo c on c.embarque_item_id = ei.id
  where ei.pedido_item_id = pi.id
) emb on true
left join lateral (
  select count(*) filter (where i.estado = 'abierta') as incidencias_abiertas,
         sum(i.cantidad) filter (where i.estado = 'absorbida') as cantidad_perdida
  from incidencias i
  join embarque_items ei on ei.id = i.embarque_item_id
  where ei.pedido_item_id = pi.id
) inc on true
left join lateral (
  select
    count(*) filter (where d.estado in ('solicitada', 'aceptada')) as devoluciones_abiertas,
    sum(d.cantidad) filter (where d.estado = 'completada' and d.resolucion = 'reembolso') as cantidad_reembolsada_plataforma,
    sum(d.monto_reembolso) filter (where d.estado = 'completada' and d.resolucion = 'reembolso') as monto_reembolso_plataforma
  from devoluciones d
  join incidencias i on i.id = d.incidencia_id
  join embarque_items ei on ei.id = i.embarque_item_id
  where ei.pedido_item_id = pi.id
) dev on true
left join lateral (
  select count(*) as reposiciones_pendientes
  from reposiciones r
  join devoluciones d on d.id = r.devolucion_id
  join incidencias i on i.id = d.incidencia_id
  join embarque_items ei on ei.id = i.embarque_item_id
  where ei.pedido_item_id = pi.id and r.estado in ('pendiente', 'en_transito')
) rep on true
left join lateral (
  select
    sum(eni.cantidad) filter (where en.estado = 'entregada') as cantidad_entregada,
    sum(eni.cantidad) filter (where en.estado in ('pendiente', 'enviada')) as cantidad_en_entrega
  from entrega_items eni
  join entregas en on en.id = eni.entrega_id
  where eni.pedido_item_id = pi.id
) ent on true;

-- Rentabilidad por pedido. Ventas reconocidas: el total del pedido; si el
-- cliente desistió o se canceló, solo lo que efectivamente pagó (sus pagos
-- se conservan y el producto queda en manos del negocio).
create view v_pedidos_rentabilidad
with (security_invoker = true) as
select
  p.id as pedido_id,
  case when p.estado in ('desistido', 'cancelado') then p.total_abonado else p.total_pedido end as ventas,
  coalesce(sum(l.costo_producto), 0) as costo_productos,
  coalesce(sum(l.costo_importacion), 0) as costo_importacion,
  coalesce(sum(l.monto_reembolso_plataforma), 0) as reembolsos_plataforma,
  count(pi.id) filter (where pi.precio_compra is null and pi.estado_item <> 'no_disponible') as productos_sin_costo,
  (case when p.estado in ('desistido', 'cancelado') then p.total_abonado else p.total_pedido end)
    - coalesce(sum(l.costo_producto), 0)
    - coalesce(sum(l.costo_importacion), 0) as ganancia
from pedidos p
left join pedido_items pi on pi.pedido_id = p.id
left join v_pedido_items_logistica l on l.pedido_item_id = pi.id
group by p.id;

-- ══════════════════════════════════════════════════════════════════════
-- 8. RECÁLCULO DE ESTADOS
-- ══════════════════════════════════════════════════════════════════════

create or replace function sincronizar_estado_pedido(p_pedido_id uuid)
returns void
language plpgsql
as $$
declare
  v_actual text;
  v_vigentes int;
  v_entregados int;
  v_con_entrega int;
  v_recibidos int;
  v_parciales int;
  v_transito int;
  v_nuevo text;
begin
  select estado into v_actual from pedidos where id = p_pedido_id for update;
  -- Estados manuales / terminales: la logística no los pisa.
  if v_actual is null or v_actual in ('cotizacion', 'completado', 'desistido', 'cancelado') then
    return;
  end if;

  select
    count(*) filter (where estado_item not in ('no_disponible', 'reembolsado', 'desistido')),
    count(*) filter (where estado_item = 'entregado'),
    count(*) filter (where estado_item in ('entregado', 'entregado_parcial')),
    count(*) filter (where estado_item = 'recibido'),
    count(*) filter (where estado_item in ('recibido_parcial', 'con_incidencia', 'en_devolucion', 'pendiente_reposicion')),
    count(*) filter (where estado_item = 'en_transito')
  into v_vigentes, v_entregados, v_con_entrega, v_recibidos, v_parciales, v_transito
  from pedido_items
  where pedido_id = p_pedido_id;

  if v_vigentes = 0 then
    return;
  end if;

  v_nuevo := case
    when v_entregados = v_vigentes then 'entregado'
    when v_con_entrega > 0 then 'entregado_parcial'
    when v_recibidos = v_vigentes then 'recibido'
    when v_recibidos > 0 or v_parciales > 0 then 'recibido_parcial'
    when v_transito > 0 then 'en_transito'
    else null -- sin movimiento logístico: se respeta confirmado/comprado
  end;

  -- La clasificación ("listo para entrega") es manual y se conserva
  -- mientras no haya entregas.
  if v_actual = 'listo_entrega' and v_nuevo in ('recibido', 'recibido_parcial') then
    return;
  end if;

  if v_nuevo is not null and v_nuevo is distinct from v_actual then
    update pedidos set estado = v_nuevo where id = p_pedido_id;
  end if;
end;
$$;

create or replace function recalcular_estado_item(p_item_id uuid)
returns void
language plpgsql
as $$
declare
  v_item pedido_items;
  r v_pedido_items_logistica;
  v_neto int;
  v_estado text;
begin
  select * into v_item from pedido_items where id = p_item_id;
  if not found or v_item.estado_item = 'no_disponible' then
    return;
  end if;

  select * into r from v_pedido_items_logistica where pedido_item_id = p_item_id;

  -- Sin ningún movimiento logístico se respeta el estado manual
  -- (pendiente / comprado / legado).
  if r.cantidad_embarcada = 0 and r.cantidad_entregada = 0 and r.cantidad_en_transito = 0
     and v_item.desistido_at is null then
    return;
  end if;

  -- Unidades que todavía se esperan entregar al cliente.
  v_neto := v_item.cantidad - r.cantidad_reembolsada_plataforma - r.cantidad_perdida;

  v_estado := case
    when v_neto <= 0 then 'reembolsado'
    when r.cantidad_entregada >= v_neto then 'entregado'
    when v_item.desistido_at is not null then 'desistido'
    when r.reposiciones_pendientes > 0 then 'pendiente_reposicion'
    when r.devoluciones_abiertas > 0 then 'en_devolucion'
    when r.incidencias_abiertas > 0 then 'con_incidencia'
    when r.cantidad_entregada > 0 then 'entregado_parcial'
    when r.cantidad_ok >= v_neto then 'recibido'
    when r.cantidad_ok > 0 then 'recibido_parcial'
    when r.cantidad_en_transito > 0 then 'en_transito'
    else 'comprado'
  end;

  if v_estado is distinct from v_item.estado_item then
    update pedido_items set estado_item = v_estado where id = p_item_id;
  end if;

  perform sincronizar_estado_pedido(v_item.pedido_id);
end;
$$;

create or replace function recalcular_estado_embarque(p_embarque_id uuid)
returns void
language plpgsql
as $$
declare
  v_lineas int;
  v_pendientes int;
  v_incidencias int;
  v_fecha timestamptz;
  v_estado text;
begin
  select count(*), count(*) filter (where cantidad_recibida is null), max(fecha_recepcion)
    into v_lineas, v_pendientes, v_fecha
  from embarque_items where embarque_id = p_embarque_id;

  select count(*) into v_incidencias
  from incidencias i
  join embarque_items ei on ei.id = i.embarque_item_id
  where ei.embarque_id = p_embarque_id and i.estado in ('abierta', 'en_reclamo');

  v_estado := case
    when v_lineas = 0 or v_pendientes = v_lineas then 'en_transito'
    when v_pendientes > 0 then 'recibido_parcial'
    when v_incidencias > 0 then 'con_incidencias'
    else 'recibido'
  end;

  update embarques
  set estado = v_estado,
      fecha_recepcion = case when v_pendientes < v_lineas then v_fecha else null end
  where id = p_embarque_id
    and (estado, fecha_recepcion) is distinct from (v_estado, case when v_pendientes < v_lineas then v_fecha else null end);
end;
$$;

create or replace function recalcular_estado_reposicion(p_reposicion_id uuid)
returns void
language plpgsql
as $$
declare
  v_cantidad int;
  v_lineas int;
  v_pendientes int;
  v_ok int;
  v_estado text;
begin
  select cantidad into v_cantidad from reposiciones where id = p_reposicion_id;
  if not found then return; end if;

  select count(*), count(*) filter (where cantidad_recibida is null), coalesce(sum(cantidad_ok), 0)
    into v_lineas, v_pendientes, v_ok
  from embarque_items where reposicion_id = p_reposicion_id;

  v_estado := case
    when v_lineas = 0 then 'pendiente'
    when v_pendientes > 0 then 'en_transito'
    when v_ok >= v_cantidad then 'recibida'
    else 'con_incidencia'
  end;

  update reposiciones set estado = v_estado where id = p_reposicion_id and estado is distinct from v_estado;
end;
$$;

create or replace function recalcular_estado_incidencia(p_incidencia_id uuid)
returns void
language plpgsql
as $$
declare
  v_inc incidencias;
  v_cubierto int;
  v_activas int;
  v_estado text;
begin
  select * into v_inc from incidencias where id = p_incidencia_id;
  if not found then return; end if;

  select coalesce(sum(cantidad) filter (where estado = 'completada'), 0),
         count(*) filter (where estado in ('solicitada', 'aceptada'))
    into v_cubierto, v_activas
  from devoluciones where incidencia_id = p_incidencia_id;

  v_estado := case
    when v_cubierto >= v_inc.cantidad then 'resuelta'
    when v_activas > 0 then 'en_reclamo'
    when v_inc.estado = 'absorbida' then 'absorbida'
    else 'abierta' -- p.ej. la plataforma rechazó el reclamo
  end;

  if v_estado is distinct from v_inc.estado then
    update incidencias
    set estado = v_estado,
        fecha_resolucion = case when v_estado in ('resuelta', 'absorbida') then now() else null end
    where id = p_incidencia_id;
  end if;
end;
$$;

-- ── Triggers que encadenan los recálculos ─────────────────────────────

create or replace function trg_embarque_items_recalcular()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform recalcular_estado_embarque(old.embarque_id);
    if old.reposicion_id is not null then perform recalcular_estado_reposicion(old.reposicion_id); end if;
    perform recalcular_estado_item(old.pedido_item_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform recalcular_estado_embarque(new.embarque_id);
    if new.reposicion_id is not null then perform recalcular_estado_reposicion(new.reposicion_id); end if;
    perform recalcular_estado_item(new.pedido_item_id);
  end if;
  return null;
end;
$$;

create trigger trg_embarque_items_recalcular
  after insert or update or delete on embarque_items
  for each row execute function trg_embarque_items_recalcular();

-- El costo de un embarque afecta a todos sus productos (solo cambia la
-- rentabilidad, que es vista; no hay estado que recalcular) — pero sí es un
-- egreso real: se asienta en transacciones y cada cambio asienta la diferencia.
create or replace function trg_embarques_costo()
returns trigger
language plpgsql
as $$
declare
  v_delta numeric(10,2);
begin
  v_delta := case tg_op
    when 'INSERT' then new.costo_total
    when 'UPDATE' then new.costo_total - old.costo_total
    else -old.costo_total
  end;

  if v_delta > 0 then
    insert into transacciones (tipo, monto, categoria) values ('egreso', v_delta, 'costo_embarque');
  elsif v_delta < 0 then
    insert into transacciones (tipo, monto, categoria) values ('ingreso', -v_delta, 'ajuste_costo_embarque');
  end if;

  return null;
end;
$$;

create trigger trg_embarques_costo
  after insert or update of costo_total or delete on embarques
  for each row execute function trg_embarques_costo();

create or replace function trg_incidencias_recalcular()
returns trigger
language plpgsql
as $$
declare
  v_ei embarque_items;
begin
  select * into v_ei from embarque_items where id = coalesce(new.embarque_item_id, old.embarque_item_id);
  if found then
    perform recalcular_estado_embarque(v_ei.embarque_id);
    perform recalcular_estado_item(v_ei.pedido_item_id);
  end if;
  return null;
end;
$$;

create trigger trg_incidencias_recalcular
  after insert or update of estado or delete on incidencias
  for each row execute function trg_incidencias_recalcular();

create or replace function trg_devoluciones_recalcular()
returns trigger
language plpgsql
as $$
declare
  v_item_id uuid;
begin
  perform recalcular_estado_incidencia(coalesce(new.incidencia_id, old.incidencia_id));

  select ei.pedido_item_id into v_item_id
  from incidencias i join embarque_items ei on ei.id = i.embarque_item_id
  where i.id = coalesce(new.incidencia_id, old.incidencia_id);
  if v_item_id is not null then
    perform recalcular_estado_item(v_item_id);
  end if;
  return null;
end;
$$;

create trigger trg_devoluciones_recalcular
  after insert or update or delete on devoluciones
  for each row execute function trg_devoluciones_recalcular();

create or replace function trg_reposiciones_recalcular()
returns trigger
language plpgsql
as $$
declare
  v_item_id uuid;
begin
  select ei.pedido_item_id into v_item_id
  from devoluciones d
  join incidencias i on i.id = d.incidencia_id
  join embarque_items ei on ei.id = i.embarque_item_id
  where d.id = coalesce(new.devolucion_id, old.devolucion_id);
  if v_item_id is not null then
    perform recalcular_estado_item(v_item_id);
  end if;
  return null;
end;
$$;

create trigger trg_reposiciones_recalcular
  after insert or update of estado or delete on reposiciones
  for each row execute function trg_reposiciones_recalcular();

create or replace function trg_entregas_recalcular()
returns trigger
language plpgsql
as $$
declare
  v_item_id uuid;
begin
  if tg_table_name = 'entrega_items' then
    perform recalcular_estado_item(coalesce(new.pedido_item_id, old.pedido_item_id));
  else
    for v_item_id in
      select pedido_item_id from entrega_items where entrega_id = coalesce(new.id, old.id)
    loop
      perform recalcular_estado_item(v_item_id);
    end loop;
    if new.estado = 'entregada' and new.fecha_entrega is null then
      update entregas set fecha_entrega = now() where id = new.id;
    end if;
  end if;
  return null;
end;
$$;

create trigger trg_entrega_items_recalcular
  after insert or update or delete on entrega_items
  for each row execute function trg_entregas_recalcular();

create trigger trg_entregas_recalcular
  after update of estado on entregas
  for each row execute function trg_entregas_recalcular();

-- Desistimiento / cantidad / no disponible en un producto también mueven su estado.
create or replace function trg_pedido_items_logistica()
returns trigger
language plpgsql
as $$
begin
  perform recalcular_estado_item(new.id);
  return null;
end;
$$;

create trigger trg_pedido_items_logistica
  after update of desistido_at, cantidad on pedido_items
  for each row execute function trg_pedido_items_logistica();

-- ══════════════════════════════════════════════════════════════════════
-- 9. VALIDACIONES DE CANTIDADES (no se puede enviar/entregar/devolver de más)
-- ══════════════════════════════════════════════════════════════════════

create or replace function validar_embarque_item()
returns trigger
language plpgsql
as $$
declare
  v_item pedido_items;
  v_ya int;
  v_rep_cantidad int;
  v_rep_item uuid;
begin
  select * into v_item from pedido_items where id = new.pedido_item_id;

  if new.reposicion_id is null then
    if v_item.estado_item = 'no_disponible' or v_item.desistido_at is not null then
      raise exception 'El producto "%" no está disponible para embarcar', v_item.nombre using errcode = '23514';
    end if;
    select coalesce(sum(cantidad_esperada), 0) into v_ya
    from embarque_items
    where pedido_item_id = new.pedido_item_id and reposicion_id is null and id <> new.id;
    if v_ya + new.cantidad_esperada > v_item.cantidad then
      raise exception 'El producto "%" solo tiene % unidad(es) por embarcar', v_item.nombre, v_item.cantidad - v_ya
        using errcode = '23514';
    end if;
  else
    select r.cantidad, ei.pedido_item_id into v_rep_cantidad, v_rep_item
    from reposiciones r
    join devoluciones d on d.id = r.devolucion_id
    join incidencias i on i.id = d.incidencia_id
    join embarque_items ei on ei.id = i.embarque_item_id
    where r.id = new.reposicion_id;
    if v_rep_item is distinct from new.pedido_item_id then
      raise exception 'La reposición no corresponde a este producto' using errcode = '23514';
    end if;
    select coalesce(sum(cantidad_esperada), 0) into v_ya
    from embarque_items where reposicion_id = new.reposicion_id and id <> new.id;
    if v_ya + new.cantidad_esperada > v_rep_cantidad then
      raise exception 'La reposición solo tiene % unidad(es) por embarcar', v_rep_cantidad - v_ya using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validar_embarque_item
  before insert or update of cantidad_esperada, pedido_item_id, reposicion_id on embarque_items
  for each row execute function validar_embarque_item();

create or replace function validar_entrega_item()
returns trigger
language plpgsql
as $$
declare
  v_ok int;
  v_asignado int;
  v_nombre text;
  v_pedido_entrega uuid;
  v_pedido_item uuid;
begin
  select pedido_id into v_pedido_entrega from entregas where id = new.entrega_id;
  select pedido_id, nombre into v_pedido_item, v_nombre from pedido_items where id = new.pedido_item_id;
  if v_pedido_entrega is distinct from v_pedido_item then
    raise exception 'El producto no pertenece al pedido de la entrega' using errcode = '23514';
  end if;

  select cantidad_ok into v_ok from v_pedido_items_logistica where pedido_item_id = new.pedido_item_id;
  select coalesce(sum(eni.cantidad), 0) into v_asignado
  from entrega_items eni join entregas en on en.id = eni.entrega_id
  where eni.pedido_item_id = new.pedido_item_id and en.estado <> 'no_retirada' and eni.id <> new.id;

  if v_asignado + new.cantidad > v_ok then
    raise exception 'Solo hay % unidad(es) recibidas de "%" disponibles para entregar', greatest(v_ok - v_asignado, 0), v_nombre
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_validar_entrega_item
  before insert or update of cantidad on entrega_items
  for each row execute function validar_entrega_item();

create or replace function validar_devolucion()
returns trigger
language plpgsql
as $$
declare
  v_inc incidencias;
  v_ya int;
begin
  select * into v_inc from incidencias where id = new.incidencia_id;
  select coalesce(sum(cantidad), 0) into v_ya
  from devoluciones where incidencia_id = new.incidencia_id and estado <> 'rechazada' and id <> new.id;
  if new.estado <> 'rechazada' and v_ya + new.cantidad > v_inc.cantidad then
    raise exception 'La incidencia solo tiene % unidad(es) sin reclamar', v_inc.cantidad - v_ya using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_validar_devolucion
  before insert or update of cantidad, estado on devoluciones
  for each row execute function validar_devolucion();

-- ══════════════════════════════════════════════════════════════════════
-- 10. OPERACIONES ATÓMICAS (las llama la API)
-- ══════════════════════════════════════════════════════════════════════

-- p_lineas: [{ pedido_item_id, cantidad, reposicion_id? }]
create or replace function crear_embarque(
  p_guia text, p_paqueteria text, p_fecha_envio date, p_costo_total numeric, p_nota text, p_lineas jsonb
)
returns embarques
language plpgsql
as $$
declare
  v_emb embarques;
begin
  if jsonb_array_length(coalesce(p_lineas, '[]'::jsonb)) = 0 then
    raise exception 'El embarque debe tener al menos un producto' using errcode = '23514';
  end if;

  insert into embarques (guia, paqueteria, fecha_envio, costo_total, nota)
  values (nullif(trim(p_guia), ''), p_paqueteria, coalesce(p_fecha_envio, current_date), coalesce(p_costo_total, 0), nullif(trim(p_nota), ''))
  returning * into v_emb;

  insert into embarque_items (embarque_id, pedido_item_id, reposicion_id, cantidad_esperada)
  select v_emb.id,
         (l->>'pedido_item_id')::uuid,
         nullif(l->>'reposicion_id', '')::uuid,
         (l->>'cantidad')::int
  from jsonb_array_elements(p_lineas) l;

  -- Comprar un producto y mandarlo en un embarque implica que el pedido ya
  -- se compró: si seguía en confirmado/cotización, avanza.
  update pedidos set estado = 'comprado'
  where estado in ('cotizacion', 'confirmado')
    and id in (
      select pi.pedido_id from embarque_items ei join pedido_items pi on pi.id = ei.pedido_item_id
      where ei.embarque_id = v_emb.id
    );
  perform sincronizar_estado_pedido(pi.pedido_id)
  from (select distinct pi.pedido_id from embarque_items ei join pedido_items pi on pi.id = ei.pedido_item_id
        where ei.embarque_id = v_emb.id) pi;

  select * into v_emb from embarques where id = v_emb.id;
  return v_emb;
end;
$$;

-- Registra (o corrige) la recepción de líneas de un embarque y genera las
-- incidencias. p_lineas: [{ embarque_item_id, cantidad_recibida, cantidad_ok,
-- tipo_incidencia?: 'danado'|'equivocado', nota? }]
-- Faltante (llegó 0) / incompleto (llegó menos) se deducen de las cantidades;
-- dañado / equivocado aplican a lo que llegó pero no sirve.
create or replace function registrar_recepcion(p_embarque_id uuid, p_fecha timestamptz, p_lineas jsonb)
returns void
language plpgsql
as $$
declare
  l jsonb;
  v_ei embarque_items;
  v_recibida int;
  v_ok int;
  v_tipo text;
begin
  for l in select * from jsonb_array_elements(p_lineas)
  loop
    select * into v_ei from embarque_items
    where id = (l->>'embarque_item_id')::uuid and embarque_id = p_embarque_id
    for update;
    if not found then
      raise exception 'Línea de embarque no encontrada' using errcode = 'P0002';
    end if;

    v_recibida := (l->>'cantidad_recibida')::int;
    v_ok := (l->>'cantidad_ok')::int;
    v_tipo := coalesce(nullif(l->>'tipo_incidencia', ''), 'danado');
    if v_tipo not in ('danado', 'equivocado') then
      raise exception 'tipo_incidencia inválido' using errcode = '22023';
    end if;

    -- Corregir una recepción solo es seguro si sus incidencias no avanzaron.
    if exists (
      select 1 from incidencias i
      where i.embarque_item_id = v_ei.id
        and (i.estado <> 'abierta' or exists (select 1 from devoluciones d where d.incidencia_id = i.id))
    ) then
      raise exception 'La recepción de este producto ya tiene reclamos en curso; no se puede corregir' using errcode = '23514';
    end if;
    delete from incidencias where embarque_item_id = v_ei.id;

    update embarque_items
    set cantidad_recibida = v_recibida,
        cantidad_ok = v_ok,
        fecha_recepcion = coalesce(p_fecha, now()),
        nota_recepcion = nullif(trim(l->>'nota'), '')
    where id = v_ei.id;

    if v_recibida < v_ei.cantidad_esperada then
      insert into incidencias (embarque_item_id, tipo, cantidad, descripcion)
      values (v_ei.id, case when v_recibida = 0 then 'faltante' else 'incompleto' end,
              v_ei.cantidad_esperada - v_recibida, nullif(trim(l->>'nota'), ''));
    end if;
    if v_ok < v_recibida then
      insert into incidencias (embarque_item_id, tipo, cantidad, descripcion)
      values (v_ei.id, v_tipo, v_recibida - v_ok, nullif(trim(l->>'nota'), ''));
    end if;
  end loop;

  perform recalcular_estado_embarque(p_embarque_id);
end;
$$;

-- Resuelve una devolución: reembolso de la plataforma o reposición (que
-- queda pendiente de viajar en un embarque nuevo).
create or replace function resolver_devolucion(p_devolucion_id uuid, p_accion text, p_monto numeric)
returns devoluciones
language plpgsql
as $$
declare
  v_dev devoluciones;
begin
  select * into v_dev from devoluciones where id = p_devolucion_id for update;
  if not found then
    raise exception 'Devolución no encontrada' using errcode = 'P0002';
  end if;
  if v_dev.estado in ('rechazada', 'completada') then
    raise exception 'La devolución ya está cerrada' using errcode = '23514';
  end if;

  if p_accion = 'aceptar' then
    update devoluciones set estado = 'aceptada' where id = p_devolucion_id;
  elsif p_accion = 'rechazar' then
    update devoluciones set estado = 'rechazada', fecha_resolucion = now() where id = p_devolucion_id;
  elsif p_accion = 'reembolso' then
    if v_dev.resolucion <> 'reembolso' then
      raise exception 'Esta devolución se pidió como reposición' using errcode = '23514';
    end if;
    if p_monto is null or p_monto < 0 then
      raise exception 'Monto de reembolso inválido' using errcode = '22023';
    end if;
    update devoluciones
    set estado = 'completada', monto_reembolso = p_monto, fecha_resolucion = now()
    where id = p_devolucion_id;
  elsif p_accion = 'reposicion' then
    if v_dev.resolucion <> 'reposicion' then
      raise exception 'Esta devolución se pidió como reembolso' using errcode = '23514';
    end if;
    insert into reposiciones (devolucion_id, cantidad) values (p_devolucion_id, v_dev.cantidad);
    update devoluciones set estado = 'completada', fecha_resolucion = now() where id = p_devolucion_id;
  else
    raise exception 'Acción inválida' using errcode = '22023';
  end if;

  select * into v_dev from devoluciones where id = p_devolucion_id;
  return v_dev;
end;
$$;

-- p_items: [{ pedido_item_id, cantidad }]
create or replace function crear_entrega(
  p_pedido_id uuid, p_modalidad text, p_encomendista text, p_agencia_punto text,
  p_fecha_programada date, p_nota text, p_items jsonb
)
returns entregas
language plpgsql
as $$
declare
  v_ent entregas;
begin
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'La entrega debe incluir al menos un producto' using errcode = '23514';
  end if;

  insert into entregas (pedido_id, modalidad, encomendista, agencia_punto, fecha_programada, nota)
  values (p_pedido_id, p_modalidad, nullif(trim(p_encomendista), ''), nullif(trim(p_agencia_punto), ''),
          p_fecha_programada, nullif(trim(p_nota), ''))
  returning * into v_ent;

  insert into entrega_items (entrega_id, pedido_item_id, cantidad)
  select v_ent.id, (i->>'pedido_item_id')::uuid, (i->>'cantidad')::int
  from jsonb_array_elements(p_items) i
  where (i->>'cantidad')::int > 0;

  return v_ent;
end;
$$;

-- Desistimiento: el cliente ya no quiere (o no retira) sus productos. NO es
-- una cancelación: se conservan pagos, productos e historial. p_item_ids
-- null = todo lo que aún no se entregó.
create or replace function registrar_desistimiento(p_pedido_id uuid, p_motivo text, p_item_ids uuid[])
returns void
language plpgsql
as $$
declare
  v_pendientes int;
begin
  update pedido_items pi
  set desistido_at = now()
  where pi.pedido_id = p_pedido_id
    and pi.desistido_at is null
    and pi.estado_item not in ('entregado', 'no_disponible', 'reembolsado')
    and (p_item_ids is null or pi.id = any(p_item_ids));

  -- Si ya no queda nada vigente por entregar, el pedido entero pasa a desistido.
  select count(*) into v_pendientes
  from pedido_items
  where pedido_id = p_pedido_id
    and desistido_at is null
    and estado_item not in ('entregado', 'no_disponible', 'reembolsado');

  if v_pendientes = 0 then
    update pedidos
    set estado = 'desistido', desistido_at = now(), motivo_desistimiento = nullif(trim(p_motivo), '')
    where id = p_pedido_id;
  else
    update pedidos
    set motivo_desistimiento = coalesce(nullif(trim(p_motivo), ''), motivo_desistimiento)
    where id = p_pedido_id;
  end if;
end;
$$;

create or replace function revertir_desistimiento(p_pedido_id uuid)
returns void
language plpgsql
as $$
begin
  update pedidos
  set estado = 'comprado', desistido_at = null, motivo_desistimiento = null
  where id = p_pedido_id and estado = 'desistido';

  -- trg_pedido_items_logistica recalcula cada producto.
  update pedido_items set desistido_at = null
  where pedido_id = p_pedido_id and desistido_at is not null;

  -- Productos sin logística que quedaron en 'desistido' vuelven a 'comprado'.
  update pedido_items set estado_item = 'comprado'
  where pedido_id = p_pedido_id and estado_item = 'desistido';

  perform sincronizar_estado_pedido(p_pedido_id);
end;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- 11. RLS (igual que el resto: solo usuarios autenticados; la API usa service role)
-- ══════════════════════════════════════════════════════════════════════

alter table embarques enable row level security;
alter table embarque_items enable row level security;
alter table incidencias enable row level security;
alter table devoluciones enable row level security;
alter table reposiciones enable row level security;
alter table entregas enable row level security;
alter table entrega_items enable row level security;
alter table historial_estados enable row level security;

create policy "authenticated_all" on embarques for all to authenticated using (true) with check (true);
create policy "authenticated_all" on embarque_items for all to authenticated using (true) with check (true);
create policy "authenticated_all" on incidencias for all to authenticated using (true) with check (true);
create policy "authenticated_all" on devoluciones for all to authenticated using (true) with check (true);
create policy "authenticated_all" on reposiciones for all to authenticated using (true) with check (true);
create policy "authenticated_all" on entregas for all to authenticated using (true) with check (true);
create policy "authenticated_all" on entrega_items for all to authenticated using (true) with check (true);
create policy "authenticated_all" on historial_estados for all to authenticated using (true) with check (true);
