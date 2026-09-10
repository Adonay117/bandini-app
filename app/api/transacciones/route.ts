import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { parsePaginacion } from '@/lib/utils/pagination';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tipo = params.get('tipo');
  const desde = params.get('desde');
  const hasta = params.get('hasta');
  const paginado = params.has('page');

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from('transacciones')
    .select('*', paginado ? { count: 'exact' } : undefined)
    .order('fecha', { ascending: false });

  if (tipo === 'ingreso' || tipo === 'egreso') {
    query = query.eq('tipo', tipo);
  }
  if (desde) query = query.gte('fecha', `${desde}T00:00:00`);
  if (hasta) query = query.lte('fecha', `${hasta}T23:59:59.999`);

  if (paginado) {
    const { page, pageSize, from, to } = parsePaginacion(params);
    const { data, error, count } = await query.range(from, to);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Los KPIs de ingresos/egresos/balance siguen el mismo rango de fechas y
    // tipo que la lista (para "dar seguimiento" a un período), pero sobre
    // TODAS las filas que califican, no solo la página actual: se calculan
    // aparte con una consulta liviana (solo tipo+monto).
    let totalesQuery = supabase.from('transacciones').select('tipo, monto');
    if (tipo === 'ingreso' || tipo === 'egreso') totalesQuery = totalesQuery.eq('tipo', tipo);
    if (desde) totalesQuery = totalesQuery.gte('fecha', `${desde}T00:00:00`);
    if (hasta) totalesQuery = totalesQuery.lte('fecha', `${hasta}T23:59:59.999`);
    const { data: todas, error: totalesError } = await totalesQuery;
    if (totalesError) return NextResponse.json({ error: totalesError.message }, { status: 500 });
    const totales = (todas ?? []).reduce(
      (acc, t) => {
        if (t.tipo === 'ingreso') acc.ingresos += Number(t.monto);
        else acc.egresos += Number(t.monto);
        return acc;
      },
      { ingresos: 0, egresos: 0 }
    );

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, pageSize, totales });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tipo, monto, categoria } = body;

  if (tipo !== 'ingreso' && tipo !== 'egreso') {
    return NextResponse.json({ error: 'tipo debe ser "ingreso" o "egreso"' }, { status: 400 });
  }
  if (!(monto > 0)) {
    return NextResponse.json({ error: 'monto debe ser mayor a 0' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('transacciones')
    .insert({ tipo, monto, categoria: categoria || null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
