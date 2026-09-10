import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { parsePaginacion } from '@/lib/utils/pagination';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const tipo = searchParams.get('tipo');
  const soloMerma = searchParams.get('motivo') === 'merma';
  const paginado = searchParams.has('page');

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from('movimientos_inventario')
    .select('*', paginado ? { count: 'exact' } : undefined)
    .eq('producto_id', id)
    .order('fecha', { ascending: false });

  if (tipo) query = query.eq('tipo', tipo);
  if (soloMerma) query = query.not('motivo', 'is', null);

  if (paginado) {
    const { page, pageSize, from, to } = parsePaginacion(searchParams, 10);
    const { data, error, count } = await query.range(from, to);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { cantidad, nota, costo_unitario } = body as { cantidad: number; nota?: string; costo_unitario?: number };

  if (!(cantidad > 0)) {
    return NextResponse.json({ error: 'cantidad debe ser mayor a 0' }, { status: 400 });
  }
  if (costo_unitario != null && !(costo_unitario >= 0)) {
    return NextResponse.json({ error: 'costo_unitario no puede ser negativo' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // abastecer_producto inserta el movimiento y suma stock_actual de forma
  // atómica; si se manda costo_unitario, también actualiza productos.precio_costo
  // (ver 0005/0006_abastecer_inventario.sql).
  const { error: rpcError } = await supabase.rpc('abastecer_producto', {
    p_producto_id: id,
    p_cantidad: cantidad,
    p_nota: nota?.trim() || null,
    p_costo_unitario: costo_unitario ?? null,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const { data: producto, error: productoError } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .single();

  if (productoError) {
    return NextResponse.json({ error: productoError.message }, { status: 500 });
  }

  return NextResponse.json({ producto }, { status: 201 });
}
