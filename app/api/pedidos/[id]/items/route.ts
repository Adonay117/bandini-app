import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { parsearCamposItem } from '@/lib/utils/pedidoItems';
import { statusDeErrorDb } from '@/lib/utils/logistica';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.from('pedido_items').select('*').eq('pedido_id', id).order('fecha_creacion');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { campos, error: errorCampos } = parsearCamposItem(body, { parcial: false });
  if (errorCampos) {
    return NextResponse.json({ error: errorCampos }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  // El trigger recalcular_totales_pedido actualiza automáticamente
  // total_articulos y total_pedido del pedido.
  const { data, error } = await supabase
    .from('pedido_items')
    .insert({ estado_item: 'pendiente', ...campos, pedido_id: id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }

  return NextResponse.json(data, { status: 201 });
}
