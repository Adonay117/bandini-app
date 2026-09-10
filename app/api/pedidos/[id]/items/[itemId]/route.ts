import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const body = await request.json();

  const supabase = createSupabaseAdminClient();
  // El trigger recalcular_totales_pedido recalcula total_articulos/total_pedido
  // automáticamente si el precio cambia.
  const { data, error } = await supabase
    .from('pedido_items')
    .update(body)
    .eq('id', itemId)
    .eq('pedido_id', id)
    .select()
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from('pedido_items').delete().eq('id', itemId).eq('pedido_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
