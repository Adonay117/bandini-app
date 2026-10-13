import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { statusDeErrorDb } from '@/lib/utils/logistica';

interface LineaRecepcion {
  embarque_item_id: string;
  cantidad_recibida: number;
  cantidad_ok: number;
  tipo_incidencia?: 'danado' | 'equivocado';
  nota?: string;
}

// Registra (o corrige) la recepción de un embarque. Por línea: cuántas
// unidades llegaron y cuántas en buen estado. registrar_recepcion genera
// las incidencias: faltante / incompleto por lo que no llegó, y dañado /
// equivocado por lo que llegó pero no sirve.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const lineas: LineaRecepcion[] = Array.isArray(body.lineas) ? body.lineas : [];

  if (lineas.length === 0) {
    return NextResponse.json({ error: 'No hay líneas para recibir' }, { status: 400 });
  }
  for (const l of lineas) {
    const recibida = Number(l.cantidad_recibida);
    const ok = Number(l.cantidad_ok);
    if (!l.embarque_item_id || !Number.isInteger(recibida) || !Number.isInteger(ok) || recibida < 0 || ok < 0 || ok > recibida) {
      return NextResponse.json(
        { error: 'Cada línea necesita cantidad recibida y cantidad en buen estado (no mayor a la recibida)' },
        { status: 400 }
      );
    }
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc('registrar_recepcion', {
    p_embarque_id: id,
    p_fecha: body.fecha ? new Date(body.fecha).toISOString() : null,
    p_lineas: lineas.map((l) => ({
      embarque_item_id: l.embarque_item_id,
      cantidad_recibida: Number(l.cantidad_recibida),
      cantidad_ok: Number(l.cantidad_ok),
      tipo_incidencia: l.tipo_incidencia ?? 'danado',
      nota: l.nota ?? null,
    })),
  });

  if (error) {
    // 23514 también cubre el check cantidad_recibida <= cantidad_esperada.
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
