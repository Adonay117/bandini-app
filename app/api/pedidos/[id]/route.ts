import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { ESTADOS_PEDIDO_MANUALES, permitidoSinProductos } from '@/lib/utils/pedidos';
import { PLATAFORMAS, statusDeErrorDb } from '@/lib/utils/logistica';

// Detalle completo del pedido con su trazabilidad: cada producto trae sus
// cantidades derivadas (vista v_pedido_items_logistica) y las líneas de
// embarque por las que pasó, con sus incidencias → devoluciones →
// reposiciones; además entregas, rentabilidad e historial de estados.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .select('*, cliente:clientes(nombre, lugar, telefono, saldo_favor)')
    .eq('id', id)
    .single();

  if (pedidoError) {
    return NextResponse.json({ error: pedidoError.message }, { status: 404 });
  }

  const [items, logistica, abonos, entregas, rentabilidad] = await Promise.all([
    supabase.from('pedido_items').select('*').eq('pedido_id', id).order('fecha_creacion'),
    supabase.from('v_pedido_items_logistica').select('*').eq('pedido_id', id),
    supabase.from('abonos_pedido').select('*').eq('pedido_id', id).order('fecha_abono', { ascending: false }),
    supabase
      .from('entregas')
      .select('*, items:entrega_items(id, pedido_item_id, cantidad)')
      .eq('pedido_id', id)
      .order('fecha_creacion', { ascending: false }),
    supabase.from('v_pedidos_rentabilidad').select('*').eq('pedido_id', id).maybeSingle(),
  ]);

  const conError = [items, logistica, abonos, entregas, rentabilidad].find((r) => r.error);
  if (conError?.error) {
    return NextResponse.json({ error: conError.error.message }, { status: 500 });
  }

  const itemIds = (items.data ?? []).map((i) => i.id);

  const [lineas, costos] =
    itemIds.length === 0
      ? [{ data: [], error: null }, { data: [], error: null }]
      : await Promise.all([
          supabase
            .from('embarque_items')
            .select(
              '*, embarque:embarques(id, numero, estado, paqueteria, guia, fecha_envio), incidencias(*, devoluciones(*, reposiciones(*)))'
            )
            .in('pedido_item_id', itemIds),
          supabase.from('v_embarque_items_costo').select('embarque_item_id, costo_importacion').in('pedido_item_id', itemIds),
        ]);

  if (lineas.error || costos.error) {
    return NextResponse.json({ error: (lineas.error ?? costos.error)!.message }, { status: 500 });
  }

  const costoPorLinea = new Map((costos.data ?? []).map((c) => [c.embarque_item_id, Number(c.costo_importacion)]));
  const logPorItem = new Map((logistica.data ?? []).map((l) => [l.pedido_item_id, l]));
  const lineasPorItem = new Map<string, unknown[]>();
  const idsTrazables: string[] = [];
  for (const l of lineas.data ?? []) {
    const lista = lineasPorItem.get(l.pedido_item_id) ?? [];
    lista.push({ ...l, costo_importacion: costoPorLinea.get(l.id) ?? 0 });
    lineasPorItem.set(l.pedido_item_id, lista);
    for (const inc of l.incidencias ?? []) {
      idsTrazables.push(inc.id);
      for (const dev of inc.devoluciones ?? []) {
        idsTrazables.push(dev.id);
        for (const rep of dev.reposiciones ?? []) idsTrazables.push(rep.id);
      }
    }
  }

  // Historial: lo que está ligado al pedido directo (pedido, productos,
  // entregas) + los estados de sus incidencias/devoluciones/reposiciones.
  const filtroHistorial = idsTrazables.length
    ? `pedido_id.eq.${id},entidad_id.in.(${idsTrazables.join(',')})`
    : `pedido_id.eq.${id}`;
  const { data: historial } = await supabase
    .from('historial_estados')
    .select('*')
    .or(filtroHistorial)
    .order('fecha', { ascending: false })
    .limit(200);

  const { cliente, ...pedidoBase } = pedido;

  return NextResponse.json({
    ...pedidoBase,
    cliente_nombre: cliente?.nombre ?? null,
    cliente_lugar: cliente?.lugar ?? null,
    cliente_telefono: cliente?.telefono ?? null,
    cliente_saldo_favor: cliente?.saldo_favor ?? 0,
    items: (items.data ?? []).map((item) => ({
      ...item,
      logistica: logPorItem.get(item.id) ?? null,
      lineas: lineasPorItem.get(item.id) ?? [],
    })),
    abonos: abonos.data ?? [],
    entregas: entregas.data ?? [],
    rentabilidad: rentabilidad.data ?? null,
    historial: historial ?? [],
  });
}

// Solo campos editables y estados manuales: los estados logísticos
// (en tránsito, recibido, entregado…) los calcula la base de datos, y el
// desistimiento tiene su propio endpoint (/desistimiento).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const cambios: Record<string, unknown> = {};

  if (body.estado !== undefined) {
    if (!ESTADOS_PEDIDO_MANUALES.includes(body.estado)) {
      return NextResponse.json(
        { error: `estado inválido. Se puede fijar a mano: ${ESTADOS_PEDIDO_MANUALES.join(', ')}` },
        { status: 400 }
      );
    }
    cambios.estado = body.estado;
    if (body.estado === 'comprado' && body.fecha_compra === undefined) {
      cambios.fecha_compra = new Date().toISOString().slice(0, 10);
    }
  }
  if (body.plataforma !== undefined) {
    if (!PLATAFORMAS.includes(body.plataforma)) {
      return NextResponse.json({ error: `plataforma debe ser una de: ${PLATAFORMAS.join(', ')}` }, { status: 400 });
    }
    cambios.plataforma = body.plataforma;
  }
  for (const campo of ['referencia_compra', 'fecha_compra', 'nota'] as const) {
    if (body[campo] !== undefined) cambios[campo] = typeof body[campo] === 'string' ? body[campo].trim() || null : body[campo];
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Una cotización vacía no puede avanzar: hace falta al menos un producto
  // para confirmar (o cualquier estado posterior). Cancelarla sí se permite.
  if (body.estado !== undefined && !permitidoSinProductos(body.estado)) {
    const { count, error: countError } = await supabase
      .from('pedido_items')
      .select('id', { count: 'exact', head: true })
      .eq('pedido_id', id);
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    if (!count) {
      return NextResponse.json(
        { error: 'Agregá al menos un producto a la cotización antes de avanzar el pedido.' },
        { status: 422 }
      );
    }
  }

  // Al pasar a "comprado" los productos aún por comprar quedan comprados.
  if (cambios.estado === 'comprado') {
    await supabase.from('pedido_items').update({ estado_item: 'comprado' }).eq('pedido_id', id).eq('estado_item', 'pendiente');
  }

  const { data, error } = await supabase.from('pedidos').update(cambios).eq('id', id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }

  return NextResponse.json(data);
}
