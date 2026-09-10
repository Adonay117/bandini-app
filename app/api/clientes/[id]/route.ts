import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (clienteError) {
    return NextResponse.json({ error: clienteError.message }, { status: 404 });
  }

  const { data: premios } = await supabase
    .from('premios_stickers')
    .select('*')
    .eq('cliente_id', id)
    .order('fecha_ganado', { ascending: false });

  const { data: ultimasVentas } = await supabase
    .from('ventas')
    .select('*')
    .eq('cliente_id', id)
    .order('fecha', { ascending: false })
    .limit(10);

  return NextResponse.json({ ...cliente, premios: premios ?? [], ultimas_ventas: ultimasVentas ?? [] });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('clientes')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const status = error.code === '23505' ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('clientes')
    .update({ activo: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
