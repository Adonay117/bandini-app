import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

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

  const { data: items } = await supabase
    .from('pedido_items')
    .select('*')
    .eq('pedido_id', id);

  const { data: abonos } = await supabase
    .from('abonos_pedido')
    .select('*')
    .eq('pedido_id', id)
    .order('fecha_abono', { ascending: false });

  const { cliente, ...pedidoBase } = pedido;

  return NextResponse.json({
    ...pedidoBase,
    cliente_nombre: cliente?.nombre ?? null,
    cliente_lugar: cliente?.lugar ?? null,
    cliente_telefono: cliente?.telefono ?? null,
    cliente_saldo_favor: cliente?.saldo_favor ?? 0,
    items: items ?? [],
    abonos: abonos ?? [],
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('pedidos')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
}
