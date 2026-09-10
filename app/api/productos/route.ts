import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { parsePaginacion } from '@/lib/utils/pagination';

export async function GET(request: NextRequest) {
  const supabase = createSupabaseAdminClient();
  const params = request.nextUrl.searchParams;
  const search = params.get('search')?.trim().replace(/[,()]/g, '');
  const categoria = params.get('categoria')?.trim();
  const activo = params.get('activo');
  const stockBajo = params.get('stock_bajo') === '1';
  const paginado = params.has('page');

  let query = supabase
    .from('productos')
    .select('*', paginado && !stockBajo ? { count: 'exact' } : undefined)
    .order('nombre', { ascending: true });

  if (search) {
    query = query.or(`nombre.ilike.%${search}%,sku.ilike.%${search}%`);
  }
  if (categoria) {
    query = query.ilike('categoria', `%${categoria}%`);
  }
  if (activo === '1' || activo === '0') {
    query = query.eq('activo', activo === '1');
  }

  // Cuenta de stock bajo con los mismos filtros de búsqueda/categoría/estado
  // pero SIN el toggle de stock_bajo ni paginación: sirve para el aviso
  // "N productos con stock bajo" aunque el filtro no esté activo todavía.
  async function contarStockBajo() {
    let q = supabase.from('productos').select('stock_actual, stock_minimo');
    if (search) q = q.or(`nombre.ilike.%${search}%,sku.ilike.%${search}%`);
    if (categoria) q = q.ilike('categoria', `%${categoria}%`);
    if (activo === '1' || activo === '0') q = q.eq('activo', activo === '1');
    const { data } = await q;
    return (data ?? []).filter((p) => p.stock_actual <= p.stock_minimo).length;
  }

  // stock_actual <= stock_minimo compara dos columnas entre sí, algo que el
  // query builder de Supabase no soporta, así que ese filtro (y su
  // paginación) se resuelve en memoria en vez de en la consulta.
  if (stockBajo) {
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const filtrados = (data ?? []).filter((p) => p.stock_actual <= p.stock_minimo);
    if (!paginado) return NextResponse.json(filtrados);
    const { page, pageSize, from, to } = parsePaginacion(params);
    return NextResponse.json({
      data: filtrados.slice(from, to + 1),
      total: filtrados.length,
      page,
      pageSize,
      stockBajoCount: filtrados.length,
    });
  }

  if (paginado) {
    const { page, pageSize, from, to } = parsePaginacion(params);
    const [{ data, error, count }, stockBajoCount] = await Promise.all([query.range(from, to), contarStockBajo()]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize, stockBajoCount });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sku, nombre, categoria, precio_costo, precio_venta, stock_actual, stock_minimo, imagen_url } = body;

  if (!sku || !nombre || precio_costo == null || precio_venta == null) {
    return NextResponse.json(
      { error: 'sku, nombre, precio_costo y precio_venta son obligatorios' },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('productos')
    .insert({
      sku,
      nombre,
      categoria: categoria ?? null,
      precio_costo,
      precio_venta,
      stock_actual: stock_actual ?? 0,
      stock_minimo: stock_minimo ?? 0,
      imagen_url: imagen_url ?? null,
    })
    .select()
    .single();

  if (error) {
    const status = error.code === '23505' ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data, { status: 201 });
}
