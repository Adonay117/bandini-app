import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('pedido_items')
    .select('*')
    .eq('pedido_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { plataforma, producto, precio, url, imagen_url, estado_item } = body;

  if (!plataforma || !producto || precio == null) {
    return NextResponse.json({ error: 'plataforma, producto y precio son obligatorios' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  // El trigger recalcular_totales_pedido actualiza automáticamente
  // total_articulos y total_pedido del pedido.
  const { data, error } = await supabase
    .from('pedido_items')
    .insert({
      pedido_id: id,
      plataforma,
      producto,
      precio,
      url: url || null,
      imagen_url: imagen_url || null,
      estado_item: estado_item ?? 'pendiente',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
