-- Vacía todas las tablas de datos del esquema public.
-- NO toca auth.users: el usuario administrador se conserva.
-- IRREVERSIBLE: haz un respaldo antes (Supabase > Database > Backups).
--
-- TRUNCATE no dispara los triggers por fila, así que no se recalcula
-- stock, saldos ni notificaciones mientras se borra.

begin;

truncate table
  public.abonos_pedido,
  public.clientes,
  public.devoluciones,
  public.embarque_items,
  public.embarques,
  public.entrega_items,
  public.entregas,
  public.historial_estados,
  public.incidencias,
  public.movimientos_inventario,
  public.movimientos_saldo_favor,
  public.notificaciones_admin,
  public.pedido_items,
  public.pedidos,
  public.premios_stickers,
  public.productos,
  public.reposiciones,
  public.transacciones,
  public.venta_items,
  public.ventas
restart identity cascade;

commit;

-- Verificación: todo debe dar 0 y el usuario debe seguir existiendo.
-- select count(*) from public.pedidos;
-- select email from auth.users;
