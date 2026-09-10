import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { parsePaginacion } from '@/lib/utils/pagination';

export async function GET(request: NextRequest) {
  const supabase = createSupabaseAdminClient();
  const params = request.nextUrl.searchParams;
  const search = params.get('search')?.trim().replace(/[,()]/g, '');
  const departamento = params.get('departamento')?.trim();
  const paginado = params.has('page');

  let query = supabase
    .from('clientes')
    .select('*', paginado ? { count: 'exact' } : undefined)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (search) {
    query = query.or(`nombre.ilike.%${search}%,telefono.ilike.%${search}%`);
  }
  if (departamento) {
    query = query.eq('departamento', departamento);
  }

  if (paginado) {
    const { page, pageSize, from, to } = parsePaginacion(params);
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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { nombre, telefono, email, fecha_nacimiento, departamento, lugar } = body;

  if (!nombre || !telefono) {
    return NextResponse.json({ error: 'nombre y telefono son obligatorios' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nombre,
      telefono,
      email: email ?? null,
      fecha_nacimiento: fecha_nacimiento ?? null,
      departamento: departamento ?? null,
      lugar: lugar ?? null,
    })
    .select()
    .single();

  if (error) {
    const status = error.code === '23505' ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data, { status: 201 });
}
