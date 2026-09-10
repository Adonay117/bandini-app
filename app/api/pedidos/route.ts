import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { parsePaginacion } from '@/lib/utils/pagination';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clienteId = params.get('cliente_id');
  const estado = params.get('estado');
  const fecha = params.get('fecha');
  const clienteNombre = params.get('cliente')?.trim();
  const lugar = params.get('lugar')?.trim();
  const paginado = params.has('page');

  const supabase = createSupabaseAdminClient();

  // Filtrar por nombre/lugar del cliente se resuelve primero a una lista de
  // cliente_id: evita depender de filtrar sobre el recurso embebido, que en
  // PostgREST es más frágil con alias.
  let clienteIds: string[] | null = null;
  if (clienteNombre || lugar) {
    let clientesQuery = supabase.from('clientes').select('id');
    if (clienteNombre) clientesQuery = clientesQuery.ilike('nombre', `%${clienteNombre}%`);
    if (lugar) clientesQuery = clientesQuery.ilike('lugar', `%${lugar}%`);
    const { data: clientesMatch, error: clientesError } = await clientesQuery;
    if (clientesError) return NextResponse.json({ error: clientesError.message }, { status: 500 });
    clienteIds = (clientesMatch ?? []).map((c) => c.id);
    if (clienteIds.length === 0) {
      if (paginado) {
        const { page, pageSize } = parsePaginacion(params);
        return NextResponse.json({ data: [], total: 0, page, pageSize });
      }
      return NextResponse.json([]);
    }
  }

  let query = supabase
    .from('pedidos')
    .select('*, cliente:clientes(nombre, lugar)', paginado ? { count: 'exact' } : undefined)
    .order('fecha_creacion', { ascending: false });

  if (clienteId) query = query.eq('cliente_id', clienteId);
  if (clienteIds) query = query.in('cliente_id', clienteIds);
  if (estado) query = query.eq('estado', estado);
  if (fecha) query = query.gte('fecha_creacion', `${fecha}T00:00:00`).lte('fecha_creacion', `${fecha}T23:59:59.999`);

  if (paginado) {
    const { page, pageSize, from, to } = parsePaginacion(params);
    const { data, error, count } = await query.range(from, to);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const pedidos = (data ?? []).map(({ cliente, ...pedido }) => ({
      ...pedido,
      cliente_nombre: cliente?.nombre ?? null,
      cliente_lugar: cliente?.lugar ?? null,
    }));
    return NextResponse.json({ data: pedidos, total: count ?? 0, page, pageSize });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pedidos = (data ?? []).map(({ cliente, ...pedido }) => ({
    ...pedido,
    cliente_nombre: cliente?.nombre ?? null,
    cliente_lugar: cliente?.lugar ?? null,
  }));

  return NextResponse.json(pedidos);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { cliente_id, estado } = body;

  if (!cliente_id) {
    return NextResponse.json({ error: 'cliente_id es obligatorio' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', cliente_id)
    .single();
  if (clienteError || !cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  // total_articulos y total_pedido arrancan en 0 y se recalculan
  // automáticamente (trigger recalcular_totales_pedido) según se agreguen artículos.
  const { data, error } = await supabase
    .from('pedidos')
    .insert({ cliente_id, estado: estado ?? 'cotizacion' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
