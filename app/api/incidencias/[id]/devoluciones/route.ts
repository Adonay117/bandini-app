import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { statusDeErrorDb } from '@/lib/utils/logistica';

// Abre un reclamo / devolución a la plataforma por (parte de) una
// incidencia, pidiendo reembolso o reposición. El trigger validar_devolucion
// impide reclamar más unidades de las que tiene la incidencia.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const cantidad = Number(body.cantidad);

  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return NextResponse.json({ error: 'cantidad debe ser un entero mayor a 0' }, { status: 400 });
  }
  if (!['reembolso', 'reposicion'].includes(body.resolucion)) {
    return NextResponse.json({ error: 'resolucion debe ser reembolso o reposicion' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: inc } = await supabase.from('incidencias').select('estado').eq('id', id).single();
  if (!inc) {
    return NextResponse.json({ error: 'Incidencia no encontrada' }, { status: 404 });
  }
  if (inc.estado === 'resuelta' || inc.estado === 'absorbida') {
    return NextResponse.json({ error: 'La incidencia ya está cerrada' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('devoluciones')
    .insert({
      incidencia_id: id,
      cantidad,
      resolucion: body.resolucion,
      referencia: body.referencia?.trim() || null,
      nota: body.nota?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }
  return NextResponse.json(data, { status: 201 });
}
