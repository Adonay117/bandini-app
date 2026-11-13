-- Más automatización del flujo de pedidos:
--  1) Se elimina el estado 'listo_entrega' (paso manual de clasificación): al
--     recibirse todo, el pedido queda en 'recibido' y ya se puede entregar.
--  2) 'completado' pasa a ser automático: un pedido 'entregado' y pagado por
--     completo (estado_pago pagado / a_favor) se completa solo, tanto cuando
--     se entrega como cuando se registra el último abono.

alter table pedidos drop constraint pedidos_estado_check;
update pedidos set estado = 'recibido' where estado = 'listo_entrega';
alter table pedidos add constraint pedidos_estado_check check (estado in (
  'confirmado', 'comprado', 'en_transito', 'recibido_parcial', 'recibido',
  'entregado_parcial', 'entregado', 'completado', 'desistido', 'cancelado'
));

create or replace function trg_pedidos_autocompletar()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'entregado' and new.estado_pago in ('pagado', 'a_favor') then
    update pedidos set estado = 'completado' where id = new.id and estado = 'entregado';
  end if;
  return null;
end;
$$;

drop trigger if exists trg_pedidos_autocompletar on pedidos;
create trigger trg_pedidos_autocompletar
  after update of estado, total_abonado, total_pedido on pedidos
  for each row execute function trg_pedidos_autocompletar();

-- Backfill
update pedidos set estado = 'completado'
where estado = 'entregado' and estado_pago in ('pagado', 'a_favor');
