import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { statusDeErrorDb } from '@/lib/utils/logistica';

// Avanza una devolución a plataforma:
//   aceptar | rechazar | reembolso (monto que devolvió la plataforma) | reposicion
// La reposición queda "por embarcar" y aparece al crear el próximo embarque.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  if (body.referencia !== undefined || body.nota !== undefined) {
    const cambios: Record<string, unknown> = {};
    if (body.referencia !== undefined) cambios.referencia = String(body.referencia).trim() || null;
    if (body.nota !== undefined) cambios.nota = String(body.nota).trim() || null;
    const { error } = await supabase.from('devoluciones').update(cambios).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }

  if (body.accion === undefined) {
    const { data, error } = await supabase.from('devoluciones').select('*').eq('id', id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
    return NextResponse.json(data);
  }

  if (!['aceptar', 'rechazar', 'reembolso', 'reposicion'].includes(body.accion)) {
    return NextResponse.json({ error: 'accion inválida' }, { status: 400 });
  }
  const monto = body.monto != null && body.monto !== '' ? Number(body.monto) : null;
  if (body.accion === 'reembolso' && !(monto != null && monto >= 0)) {
    return NextResponse.json({ error: 'Indicá el monto que reembolsó la plataforma' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('resolver_devolucion', {
    p_devolucion_id: id,
    p_accion: body.accion,
    p_monto: monto,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }
  return NextResponse.json(data);
}
