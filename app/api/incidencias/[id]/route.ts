import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { statusDeErrorDb } from '@/lib/utils/logistica';

// absorber: el negocio asume la pérdida sin reclamar a la plataforma (el
// producto deja de esperarse). reabrir: deshace eso.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  const { data: inc, error: incError } = await supabase.from('incidencias').select('*').eq('id', id).single();
  if (incError || !inc) {
    return NextResponse.json({ error: 'Incidencia no encontrada' }, { status: 404 });
  }

  const cambios: Record<string, unknown> = {};
  if (body.accion === 'absorber') {
    if (inc.estado !== 'abierta') {
      return NextResponse.json({ error: 'Solo se puede asumir la pérdida de una incidencia abierta' }, { status: 409 });
    }
    cambios.estado = 'absorbida';
    cambios.fecha_resolucion = new Date().toISOString();
  } else if (body.accion === 'reabrir') {
    if (inc.estado !== 'absorbida') {
      return NextResponse.json({ error: 'Solo se reabre una incidencia asumida como pérdida' }, { status: 409 });
    }
    cambios.estado = 'abierta';
    cambios.fecha_resolucion = null;
  } else if (body.accion !== undefined) {
    return NextResponse.json({ error: 'accion inválida' }, { status: 400 });
  }
  if (body.descripcion !== undefined) cambios.descripcion = String(body.descripcion).trim() || null;
  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const { data, error } = await supabase.from('incidencias').update(cambios).eq('id', id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }
  return NextResponse.json(data);
}
