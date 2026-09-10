-- 0004_rls.sql
-- Con el login agregado, cierra el hueco de seguridad de que la anon key
-- (pública, va en el bundle del navegador) permitía leer/escribir todas las
-- tablas directamente vía PostgREST sin pasar por la sesión. Las API routes
-- siguen funcionando igual (usan el service role, que ignora RLS); el único
-- consumidor del cliente público es el navegador ya logueado (hooks,
-- subscripción real-time de notificaciones), que ahora sí trae una sesión
-- de Supabase Auth válida.

alter table clientes enable row level security;
alter table productos enable row level security;
alter table ventas enable row level security;
alter table premios_stickers enable row level security;
alter table notificaciones_admin enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;
alter table abonos_pedido enable row level security;
alter table movimientos_inventario enable row level security;
alter table transacciones enable row level security;

create policy "authenticated_all" on clientes for all to authenticated using (true) with check (true);
create policy "authenticated_all" on productos for all to authenticated using (true) with check (true);
create policy "authenticated_all" on ventas for all to authenticated using (true) with check (true);
create policy "authenticated_all" on premios_stickers for all to authenticated using (true) with check (true);
create policy "authenticated_all" on notificaciones_admin for all to authenticated using (true) with check (true);
create policy "authenticated_all" on pedidos for all to authenticated using (true) with check (true);
create policy "authenticated_all" on pedido_items for all to authenticated using (true) with check (true);
create policy "authenticated_all" on abonos_pedido for all to authenticated using (true) with check (true);
create policy "authenticated_all" on movimientos_inventario for all to authenticated using (true) with check (true);
create policy "authenticated_all" on transacciones for all to authenticated using (true) with check (true);
