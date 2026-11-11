import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { statusDeErrorDb } from '@/lib/utils/logistica';

export async function GET(request: NextRequest) {
  const estado = request.nextUrl.searchParams.get('estado');
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from('embarques')
    .select('*, lineas:embarque_items(cantidad_esperada, cantidad_recibida, reposicion_id, pedido_item:pedido_items(pedido_id))')
    .order('fecha_envio', { ascending: false })
    .order('numero', { ascending: false });
  if (estado) query = query.eq('estado', estado);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const embarques = (data ?? []).map(({ lineas, ...embarque }) => {
    const pedidos = new Set<string>();
    let unidades = 0;
    let recibidas = 0;
    let reposiciones = 0;
    for (const l of lineas ?? []) {
      const pedidoItem = Array.isArray(l.pedido_item) ? l.pedido_item[0] : l.pedido_item;
      if (pedidoItem?.pedido_id) pedidos.add(pedidoItem.pedido_id);
      unidades += l.cantidad_esperada;
      recibidas += l.cantidad_recibida ?? 0;
      if (l.reposicion_id) reposiciones += 1;
    }
    return { ...embarque, total_lineas: (lineas ?? []).length, total_pedidos: pedidos.size, unidades, recibidas, reposiciones };
  });

  return NextResponse.json(embarques);
}

// Crea el embarque con sus líneas en una sola transacción (crear_embarque):
// valida que ningún producto se embarque más veces de las que se compró, y
// que una reposición no viaje más de una vez. El costo total queda asentado
// como egreso (trigger trg_embarques_costo).
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { guia, paqueteria, fecha_envio, costo_total, nota, lineas } = body;

  if (!paqueteria?.trim()) {
    return NextResponse.json({ error: 'paqueteria es obligatoria' }, { status: 400 });
  }
  const costo = Number(costo_total ?? 0);
  if (!(costo >= 0)) {
    return NextResponse.json({ error: 'costo_total no puede ser negativo' }, { status: 400 });
  }
  const validas: { pedido_item_id: string; cantidad: number; reposicion_id?: string | null }[] = Array.isArray(lineas)
    ? lineas.filter((l) => l?.pedido_item_id && Number.isInteger(Number(l.cantidad)) && Number(l.cantidad) > 0)
    : [];
  if (validas.length === 0) {
    return NextResponse.json({ error: 'Agregá al menos un producto al embarque' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('crear_embarque', {
    p_guia: guia ?? null,
    p_paqueteria: paqueteria.trim(),
    p_fecha_envio: fecha_envio || null,
    p_costo_total: costo,
    p_nota: nota ?? null,
    p_lineas: validas.map((l) => ({
      pedido_item_id: l.pedido_item_id,
      cantidad: Number(l.cantidad),
      reposicion_id: l.reposicion_id ?? null,
    })),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }
  return NextResponse.json(data, { status: 201 });
}
