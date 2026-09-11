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

  // Resumen con los mismos filtros de búsqueda/categoría/estado pero SIN el
  // toggle de stock_bajo ni paginación: alimenta los indicadores del
  // encabezado (stock bajo, valor de inventario, activos/inactivos).
  async function calcularResumen() {
    let q = supabase.from('productos').select('activo, stock_actual, stock_minimo, precio_costo');
    if (search) q = q.or(`nombre.ilike.%${search}%,sku.ilike.%${search}%`);
    if (categoria) q = q.ilike('categoria', `%${categoria}%`);
    if (activo === '1' || activo === '0') q = q.eq('activo', activo === '1');
    const { data } = await q;
    const filas = data ?? [];
    return {
      stockBajoCount: filas.filter((p) => p.stock_actual <= p.stock_minimo).length,
      resumen: {
        activos: filas.filter((p) => p.activo).length,
        inactivos: filas.filter((p) => !p.activo).length,
        valorInventario: filas
          .filter((p) => p.activo)
          .reduce((s, p) => s + p.stock_actual * Number(p.precio_costo), 0),
      },
    };
  }

  // Categorías existentes (sin filtro) para el selector de la lista.
  async function listarCategorias() {
    const { data } = await supabase.from('productos').select('categoria').not('categoria', 'is', null);
    return [...new Set((data ?? []).map((p) => p.categoria as string).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'es')
    );
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
    const [{ data, error, count }, { stockBajoCount, resumen }, categorias] = await Promise.all([
      query.range(from, to),
      calcularResumen(),
      listarCategorias(),
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
      stockBajoCount,
      resumen: { ...resumen, categorias },
    });
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
