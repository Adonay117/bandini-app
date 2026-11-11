import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { siguientesEstadosEntrega, statusDeErrorDb } from '@/lib/utils/logistica';

// Avanza el estado de una entrega. Al marcarla "entregada" los triggers
// recalculan el estado de cada producto y del pedido; "no_retirada" libera
// los productos para otra entrega sin perder el registro.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createSupabaseAdminClient();

  const { data: entrega, error: entregaError } = await supabase.from('entregas').select('*').eq('id', id).single();
  if (entregaError || !entrega) {
    return NextResponse.json({ error: 'Entrega no encontrada' }, { status: 404 });
  }

  const cambios: Record<string, unknown> = {};
  if (body.estado !== undefined) {
    if (!siguientesEstadosEntrega(entrega.modalidad, entrega.estado).includes(body.estado)) {
      return NextResponse.json({ error: 'Cambio de estado de entrega no válido' }, { status: 409 });
    }
    cambios.estado = body.estado;
    if (body.estado === 'entregada') cambios.fecha_entrega = new Date().toISOString();
    if (body.estado === 'pendiente') cambios.fecha_entrega = null;
  }
  for (const campo of ['encomendista', 'agencia_punto', 'nota', 'fecha_programada'] as const) {
    if (body[campo] !== undefined) cambios[campo] = typeof body[campo] === 'string' ? body[campo].trim() || null : body[campo];
  }

  const { data, error } = await supabase.from('entregas').update(cambios).eq('id', id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }
  return NextResponse.json(data);
}

// Solo se borra una entrega que todavía no salió (pendiente).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase.from('entregas').delete().eq('id', id).eq('estado', 'pendiente').select('id');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data?.length) {
    return NextResponse.json({ error: 'Solo se pueden borrar entregas pendientes' }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
