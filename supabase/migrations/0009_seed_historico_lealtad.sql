-- 0009_seed_historico_lealtad.sql
-- Carga ÚNICA del historial de fidelidad que los clientes ya traían de ANTES
-- del sistema: el monto acumulado en su tarjeta en curso, cuántas tarjetas de
-- $500 ya cerraron y cuántos premios ya cobraron.
--
-- Por qué así y no con ventas/abonos:
--   * Escribe DIRECTO en `clientes` y en `premios_stickers`. No dispara
--     ningún trigger (los de fidelidad están en INSERT de `ventas` y
--     `abonos_pedido`; el de egreso de premio está en UPDATE de
--     `premios_stickers`). Resultado: cero filas en `transacciones`,
--     `movimientos_inventario` y `notificaciones_admin`.
--   * La contabilidad (Ingresos y Egresos) arranca de cero igual.
--   * El monto sí cuenta para los premios: la lógica de la tarjeta lee
--     `clientes.monto_acumulado_tarjeta` / `stickers_actuales`.
--
-- Sobre los premios YA cobrados antes del sistema: mientras `stickers_actuales`
-- quede consistente con `monto_acumulado_tarjeta` (esta migración lo deriva
-- sola), el trigger de ventas SOLO entrega premio al CRUZAR un umbral desde
-- abajo. Un cliente sembrado en $280 / 5 stickers que ya cobró su $12 no lo
-- vuelve a ganar: sigue derecho hacia el $25 a los 10 stickers.
--
-- CÓMO USARLO
--   1. Llená los dos bloques `insert ... values` (sección 1a y, opcional, 1b).
--      Identificá al cliente por su teléfono (es único).
--   2. Corré el archivo completo de una sola vez.
--   3. Mirá el NOTICE del final. Si algún dato no cuadra, la migración aborta
--      en la sección 2, ANTES de escribir nada.
--
-- Es re-ejecutable sin duplicar: la sección 3 usa `set` (no suma) y la 4 no
-- vuelve a insertar un premio que ya exista con el mismo monto y fecha.

drop table if exists seed_lealtad;
drop table if exists seed_premios;

-- ═══ 1a. SALDO / TARJETA POR CLIENTE ═══════════════════════════════════
--   monto_en_curso ....... lo que lleva en la tarjeta ACTUAL, de 0 a 499.99
--                          (si ya completó otra tarjeta, eso va en
--                          tarjetas_completadas y el monto vuelve a arrancar).
--   tarjetas_completadas . tarjetas de $500 ya cerradas (default 0).
--   premios_ganados ...... total de premios ganados en toda su historia
--                          (cada tarjeta completa = 2; una tarjeta a medias
--                          con el $12 ya cobrado = 1).
--   gasto_historico ...... opcional (solo reportes). Si va NULL se estima
--                          como tarjetas_completadas * 500 + monto_en_curso.
--   Los stickers NO se ingresan: se derivan como floor(monto_en_curso / 50).

create temporary table seed_lealtad (
  telefono              text          not null,
  monto_en_curso        numeric(10,2) not null,
  tarjetas_completadas  int           not null default 0,
  premios_ganados       int           not null default 0,
  gasto_historico       numeric(10,2)
);

-- Descomentá tus filas (cada una termina en coma) y DEJÁ la última fila
-- '__BORRAR__' tal cual: se borra sola y evita cuidar la coma final.
insert into seed_lealtad (telefono, monto_en_curso, tarjetas_completadas, premios_ganados, gasto_historico) values
  -- ('7123-4567', 280.00, 0, 1, 280.00),
  -- ('7890-1122', 130.00, 1, 3, 630.00),
  -- ('7555-8080',  90.00, 0, 0, NULL),
  ('__BORRAR__', 0, 0, 0, NULL);

delete from seed_lealtad where telefono = '__BORRAR__';

-- ═══ 1b. (OPCIONAL) PREMIOS YA GANADOS ANTES DEL SISTEMA ══════════════
-- Solo si querés que aparezcan en la lista "Premios ganados" de la ficha.
--   premio_monto ... 12 (tarjeta a la mitad) o 25 (tarjeta completa).
--   estado ......... 'canjeado' (ya lo usó) o 'disponible' (lo ganó pero
--                    todavía no lo canjea). Default 'canjeado'.
--   fecha .......... fecha aproximada en que lo ganó/canjeó.
-- Los 'canjeado' se marcan cubierto_por_cupon = true: como se INSERTAN (no
-- se actualizan), el trigger de egreso no corre y la contabilidad no se toca.
-- `premios_ganados` de la sección 1a debe coincidir con cuántas filas ponés
-- acá por cliente.

create temporary table seed_premios (
  telefono      text          not null,
  premio_monto  numeric(10,2) not null,
  estado        text          not null default 'canjeado',
  fecha         date          not null
);

insert into seed_premios (telefono, premio_monto, estado, fecha) values
  -- ('7123-4567', 12, 'canjeado', '2025-08-15'),
  -- ('7890-1122', 12, 'canjeado', '2025-03-10'),
  -- ('7890-1122', 25, 'canjeado', '2025-09-01'),
  ('__BORRAR__', 12, 'canjeado', '2000-01-01');

delete from seed_premios where telefono = '__BORRAR__';

-- ═══ 2. VALIDACIONES (abortan antes de escribir nada real) ════════════

do $$
declare v_msg text;
begin
  -- Teléfonos que no existen en clientes
  select string_agg(t, ', ') into v_msg from (
    select telefono t from seed_lealtad
    where not exists (select 1 from clientes c where c.telefono = seed_lealtad.telefono)
    union
    select telefono t from seed_premios
    where not exists (select 1 from clientes c where c.telefono = seed_premios.telefono)
  ) x;
  if v_msg is not null then
    raise exception 'Teléfonos sin cliente registrado: %', v_msg;
  end if;

  -- Teléfonos repetidos en seed_lealtad (debe ser una fila por cliente)
  select string_agg(telefono, ', ') into v_msg
  from (select telefono from seed_lealtad group by telefono having count(*) > 1) d;
  if v_msg is not null then
    raise exception 'Teléfonos repetidos en seed_lealtad: %', v_msg;
  end if;

  -- monto_en_curso fuera de [0, 499.99]
  select string_agg(telefono || ' ($' || monto_en_curso || ')', ', ') into v_msg
  from seed_lealtad where monto_en_curso < 0 or monto_en_curso >= 500;
  if v_msg is not null then
    raise exception 'monto_en_curso debe estar entre 0 y 499.99 (la tarjeta se resetea a los 10 stickers). Revisá: %  — si completó otra tarjeta, subí tarjetas_completadas.', v_msg;
  end if;

  -- premio_monto / estado inválidos
  select string_agg(telefono, ', ') into v_msg
  from seed_premios where premio_monto not in (12, 25);
  if v_msg is not null then raise exception 'premio_monto debe ser 12 o 25. Revisá: %', v_msg; end if;

  select string_agg(telefono, ', ') into v_msg
  from seed_premios where estado not in ('canjeado', 'disponible');
  if v_msg is not null then raise exception 'estado debe ser canjeado o disponible. Revisá: %', v_msg; end if;
end $$;

-- ═══ 3. APLICAR AL HISTORIAL DEL CLIENTE ═════════════════════════════

update clientes c
set monto_acumulado_tarjeta    = s.monto_en_curso,
    stickers_actuales          = floor(s.monto_en_curso / 50)::int,
    total_tarjetas_completadas = s.tarjetas_completadas,
    total_premios_ganados      = s.premios_ganados,
    total_moneda_gastada       = coalesce(
                                   s.gasto_historico,
                                   s.tarjetas_completadas * 500 + s.monto_en_curso
                                 )
from seed_lealtad s
where c.telefono = s.telefono;

-- ═══ 4. REGISTRO DE PREMIOS HISTÓRICOS (si cargaste la sección 1b) ════

insert into premios_stickers
  (cliente_id, stickers_alcanzados, premio_monto, monto_acumulado_cuando_gano,
   estado_canje, cubierto_por_cupon, fecha_ganado, fecha_canjeado)
select
  c.id,
  case when p.premio_monto = 25 then 10 else 5 end,
  p.premio_monto,
  case when p.premio_monto = 25 then 500 else 250 end,
  p.estado,
  (p.estado = 'canjeado'),
  p.fecha::timestamptz,
  case when p.estado = 'canjeado' then p.fecha::timestamptz else null end
from seed_premios p
join clientes c on c.telefono = p.telefono
where not exists (
  select 1 from premios_stickers x
  where x.cliente_id = c.id
    and x.premio_monto = p.premio_monto
    and x.fecha_ganado::date = p.fecha
);

-- ═══ 5. RESUMEN ══════════════════════════════════════════════════════════

do $$
declare v_clientes int; v_premios int;
begin
  select count(*) into v_clientes from seed_lealtad;
  select count(*) into v_premios  from seed_premios;
  raise notice 'Seed de lealtad: % cliente(s) con saldo/stickers actualizados, % premio(s) histórico(s) registrado(s). Contabilidad sin cambios.', v_clientes, v_premios;
end $$;

drop table seed_lealtad;
drop table seed_premios;
