-- 0010_saldo_favor_y_topes.sql
-- Tres cambios de negocio sobre pedidos y fidelidad:
--
-- 1. Saldo a favor del cliente: una "billetera" para registrar plata
--    recibida sin pedido (abonos para pedidos futuros) y aplicarla después
--    a un pedido concreto.
-- 2. Tope de abono por pedido: el excedente sobre el saldo pendiente ya no
--    infla el pedido, pasa al saldo a favor del cliente (ver
--    app/api/pedidos/[id]/abonos/route.ts).
-- 3. Los cupones de tarjeta (premios_stickers) solo se pueden canjear en
--    pedidos con al menos un artículo Shein o Temu (validado en la API).
--
-- Regla de diseño: cada dólar que entrega el cliente acumula stickers y
-- genera ingreso EXACTAMENTE UNA VEZ, ya sea que caiga en un pedido
-- (abonos_pedido) o en el saldo a favor (movimientos_saldo_favor). Aplicar
-- saldo a favor a un pedido no vuelve a generar ingreso ni stickers.

-- ── clientes.saldo_favor ────────────────────────────────────────────────
-- Denormalizado como total_abonado en pedidos: nunca se escribe a mano, lo
-- recalcula recalcular_saldo_favor_cliente().
alter table clientes
  add column saldo_favor numeric(10,2) not null default 0 check (saldo_favor >= 0);

-- ── movimientos_saldo_favor ─────────────────────────────────────────────
-- Ledger del saldo a favor. monto positivo = entra plata (recarga directa o
-- excedente de un abono/premio); negativo = se aplica a un pedido.
-- es_cupon=true marca un excedente que viene de un premio de sticker (no es
-- plata del cliente, así que no debe generar ingreso ni stickers).
create table movimientos_saldo_favor (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  monto numeric(10,2) not null check (monto <> 0),
  motivo text not null check (motivo in ('recarga', 'excedente', 'aplicado_pedido', 'ajuste')),
  es_cupon boolean not null default false,
  pedido_id uuid references pedidos(id) on delete set null,
  abono_id uuid references abonos_pedido(id) on delete set null,
  metodo_pago text check (metodo_pago in ('efectivo', 'tarjeta', 'transferencia')),
  nota text,
  fecha timestamptz not null default now()
);

create index movimientos_saldo_favor_cliente_id_idx on movimientos_saldo_favor(cliente_id);

-- ── TRIGGER: recalcula clientes.saldo_favor ─────────────────────────────
create or replace function recalcular_saldo_favor_cliente()
returns trigger
language plpgsql
as $$
declare
  v_cliente_id uuid;
  v_saldo_favor numeric(10,2);
begin
  v_cliente_id := coalesce(new.cliente_id, old.cliente_id);

  select coalesce(sum(monto), 0)
    into v_saldo_favor
  from movimientos_saldo_favor
  where cliente_id = v_cliente_id;

  update clientes
  set saldo_favor = v_saldo_favor
  where id = v_cliente_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_recalcular_saldo_favor_cliente
  after insert or update or delete on movimientos_saldo_favor
  for each row
  execute function recalcular_saldo_favor_cliente();

-- ── TRIGGER: movimiento nuevo → ingreso + stickers (solo si es plata real) ──
-- Solo en INSERT, igual que procesar_abono_pedido: estos efectos no son
-- reversibles, así que no deben repetirse si el movimiento se edita/borra.
create or replace function procesar_movimiento_saldo_favor()
returns trigger
language plpgsql
as $$
begin
  if new.monto > 0 and new.motivo in ('recarga', 'excedente') and not new.es_cupon then
    insert into transacciones (tipo, monto, categoria)
    values ('ingreso', new.monto, 'saldo_favor');

    perform acumular_monto_cliente(new.cliente_id, new.monto);
  end if;

  return new;
end;
$$;

create trigger trg_procesar_movimiento_saldo_favor
  after insert on movimientos_saldo_favor
  for each row
  execute function procesar_movimiento_saldo_favor();

-- ── abonos_pedido.origen ────────────────────────────────────────────────
-- 'saldo_favor' marca un abono pagado con saldo a favor del cliente: la
-- plata ya generó ingreso/stickers cuando entró al saldo a favor, así que
-- procesar_abono_pedido no debe repetir ese efecto.
alter table abonos_pedido
  add column origen text not null default 'directo' check (origen in ('directo', 'saldo_favor'));

create or replace function procesar_abono_pedido()
returns trigger
language plpgsql
as $$
declare
  v_cliente_id uuid;
begin
  if new.origen = 'saldo_favor' then
    return new;
  end if;

  if new.premio_id is not null then
    update premios_stickers
    set estado_canje = 'canjeado', fecha_canjeado = now()
    where id = new.premio_id
      and estado_canje = 'disponible';

    return new;
  end if;

  if new.tipo = 'reembolso' then
    insert into transacciones (tipo, monto, categoria)
    values ('egreso', new.monto, 'reembolso_pedido');

    return new;
  end if;

  if new.monto > 0 then
    select cliente_id into v_cliente_id from pedidos where id = new.pedido_id;

    insert into transacciones (tipo, monto, categoria)
    values ('ingreso', new.monto, 'abono_pedido');

    if v_cliente_id is not null then
      perform acumular_monto_cliente(v_cliente_id, new.monto);
    end if;
  end if;

  return new;
end;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table movimientos_saldo_favor enable row level security;
create policy "authenticated_all" on movimientos_saldo_favor for all to authenticated using (true) with check (true);
