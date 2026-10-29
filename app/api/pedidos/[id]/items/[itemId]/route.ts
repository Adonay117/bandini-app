import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { parsearCamposItem } from '@/lib/utils/pedidoItems';
import { statusDeErrorDb } from '@/lib/utils/logistica';
import { borrarImagenesSinUso } from '@/lib/storage';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const body = await request.json();
  const { campos, error: errorCampos } = parsearCamposItem(body, { parcial: true });
  if (errorCampos) {
    return NextResponse.json({ error: errorCampos }, { status: 400 });
  }
  if (Object.keys(campos).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // No se puede bajar la cantidad por debajo de lo ya embarcado, ni cambiar
  // a mano el estado de un producto que ya tiene movimiento logístico.
  const [{ data: log }, { data: anterior }] = await Promise.all([
    supabase
      .from('v_pedido_items_logistica')
      .select('cantidad_embarcada, cantidad_entregada')
      .eq('pedido_item_id', itemId)
      .maybeSingle(),
    // Si cambia la imagen, la anterior se borra del Storage después de guardar.
    campos.imagen_url !== undefined
      ? supabase.from('pedido_items').select('imagen_url').eq('id', itemId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const tieneLogistica = Boolean(log && (log.cantidad_embarcada > 0 || log.cantidad_entregada > 0));
  if (campos.cantidad !== undefined && log && (campos.cantidad as number) < log.cantidad_embarcada) {
    return NextResponse.json(
      { error: `Ya se embarcaron ${log.cantidad_embarcada} unidad(es); la cantidad no puede ser menor.` },
      { status: 409 }
    );
  }
  if (campos.estado_item !== undefined && tieneLogistica) {
    return NextResponse.json(
      { error: 'Este producto ya está en un embarque: su estado se actualiza con la recepción y la entrega.' },
      { status: 409 }
    );
  }

  // El trigger recalcular_totales_pedido recalcula total_articulos/total_pedido
  // automáticamente si el precio o la cantidad cambian.
  const { data, error } = await supabase
    .from('pedido_items')
    .update(campos)
    .eq('id', itemId)
    .eq('pedido_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }

  if (anterior?.imagen_url && anterior.imagen_url !== data.imagen_url) {
    await borrarImagenesSinUso(supabase, [anterior.imagen_url]);
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: borrados, error } = await supabase
    .from('pedido_items')
    .delete()
    .eq('id', itemId)
    .eq('pedido_id', id)
    .select('imagen_url');

  if (error) {
    // 23503: el producto ya está en un embarque o entrega; se conserva por trazabilidad.
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'El producto ya tiene embarques o entregas registradas y no se puede quitar. Marcalo como no disponible o desistido.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await borrarImagenesSinUso(supabase, (borrados ?? []).map((b) => b.imagen_url));

  return NextResponse.json({ ok: true });
}
