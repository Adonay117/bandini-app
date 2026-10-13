import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { statusDeErrorDb } from '@/lib/utils/logistica';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const [embarque, lineas, costos] = await Promise.all([
    supabase.from('embarques').select('*').eq('id', id).single(),
    supabase
      .from('embarque_items')
      .select(
        '*, pedido_item:pedido_items(id, nombre, cantidad, peso_lb, precio_compra, imagen_url, url, estado_item, pedido:pedidos(id, numero, plataforma, cliente:clientes(nombre))), reposicion:reposiciones(id, devolucion:devoluciones(numero)), incidencias(*, devoluciones(*, reposiciones(*)))'
      )
      .eq('embarque_id', id),
    supabase.from('v_embarque_items_costo').select('embarque_item_id, costo_importacion, metodo_reparto').eq('embarque_id', id),
  ]);

  if (embarque.error) {
    return NextResponse.json({ error: embarque.error.message }, { status: statusDeErrorDb(embarque.error.code) });
  }
  if (lineas.error || costos.error) {
    return NextResponse.json({ error: (lineas.error ?? costos.error)!.message }, { status: 500 });
  }

  const costoPorLinea = new Map((costos.data ?? []).map((c) => [c.embarque_item_id, Number(c.costo_importacion)]));
  const metodo = costos.data?.[0]?.metodo_reparto ?? 'unidades';

  const conCosto = (lineas.data ?? []).map((l) => ({ ...l, costo_importacion: costoPorLinea.get(l.id) ?? 0 }));

  return NextResponse.json({ ...embarque.data, metodo_reparto: metodo, lineas: conCosto });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const cambios: Record<string, unknown> = {};

  if (body.paqueteria !== undefined) {
    if (!String(body.paqueteria).trim()) return NextResponse.json({ error: 'paqueteria es obligatoria' }, { status: 400 });
    cambios.paqueteria = String(body.paqueteria).trim();
  }
  if (body.costo_total !== undefined) {
    const costo = Number(body.costo_total);
    if (!(costo >= 0)) return NextResponse.json({ error: 'costo_total no puede ser negativo' }, { status: 400 });
    cambios.costo_total = costo;
  }
  for (const campo of ['guia', 'nota'] as const) {
    if (body[campo] !== undefined) cambios[campo] = typeof body[campo] === 'string' ? body[campo].trim() || null : null;
  }
  if (typeof body.fecha_envio === 'string' && body.fecha_envio) cambios.fecha_envio = body.fecha_envio;
  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  // Cambiar el costo asienta la diferencia en transacciones (trigger) y
  // cambia el costo de importación asignado a cada producto (vista).
  const { data, error } = await supabase.from('embarques').update(cambios).eq('id', id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }
  return NextResponse.json(data);
}

// Solo mientras no se haya registrado ninguna recepción: después el embarque
// es parte de la trazabilidad de los productos. Borrarlo revierte su costo.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { count, error: countError } = await supabase
    .from('embarque_items')
    .select('id', { count: 'exact', head: true })
    .eq('embarque_id', id)
    .not('cantidad_recibida', 'is', null);
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'El embarque ya tiene recepción registrada y no se puede borrar' }, { status: 409 });
  }

  const { error } = await supabase.from('embarques').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }
  return NextResponse.json({ ok: true });
}
