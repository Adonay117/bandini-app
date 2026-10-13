import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

// Bandeja de incidencias con todo su contexto (producto, pedido, embarque,
// devoluciones y reposiciones). Por defecto solo lo que requiere acción:
// incidencias abiertas o en reclamo, y reposiciones que aún no llegan.
export async function GET(request: NextRequest) {
  const todas = request.nextUrl.searchParams.get('todas') === '1';
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('incidencias')
    .select(
      '*, linea:embarque_items(id, cantidad_esperada, cantidad_recibida, cantidad_ok, embarque:embarques(id, numero, paqueteria), pedido_item:pedido_items(id, nombre, cantidad, imagen_url, precio_compra, url, pedido:pedidos(id, numero, plataforma, cliente:clientes(nombre)))), devoluciones(*, reposiciones(*))'
    )
    .order('fecha', { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filtradas = todas
    ? (data ?? [])
    : (data ?? []).filter(
        (i) =>
          i.estado === 'abierta' ||
          i.estado === 'en_reclamo' ||
          (i.devoluciones ?? []).some((d: { reposiciones?: { estado: string }[] }) =>
            (d.reposiciones ?? []).some((r) => r.estado === 'pendiente' || r.estado === 'en_transito')
          )
      );

  return NextResponse.json(filtradas);
}
