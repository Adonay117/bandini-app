import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { statusDeErrorDb } from '@/lib/utils/logistica';

// Desistimiento / no retiro: el cliente ya no quiere (o no recoge) sus
// productos. No es una cancelación: pagos, productos e historial se
// conservan. Sin item_ids aplica a todo lo que falta entregar; si ya no
// queda nada vigente, el pedido pasa a "desistido".
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const itemIds = Array.isArray(body.item_ids) && body.item_ids.length > 0 ? body.item_ids : null;

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc('registrar_desistimiento', {
    p_pedido_id: id,
    p_motivo: body.motivo ?? null,
    p_item_ids: itemIds,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

// Revierte el desistimiento (el cliente sí los quiere): los productos
// vuelven a su estado logístico.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc('revertir_desistimiento', { p_pedido_id: id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }
  return NextResponse.json({ ok: true });
}
