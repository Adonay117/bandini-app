import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { statusDeErrorDb } from '@/lib/utils/logistica';

// Crea una entrega (total o parcial) de productos ya recibidos. La función
// crear_entrega valida que no se entregue más de lo recibido en buen estado.
// En encomienda, lo que el cliente paga a la encomendista no se registra
// como ingreso ni costo: solo se guarda quién lleva y a qué agencia/punto.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { modalidad, encomendista, agencia_punto, fecha_programada, nota, items } = body;

  if (!['punto_propio', 'encomienda'].includes(modalidad)) {
    return NextResponse.json({ error: 'modalidad debe ser punto_propio o encomienda' }, { status: 400 });
  }
  if (modalidad === 'encomienda' && !encomendista?.trim()) {
    return NextResponse.json({ error: 'encomendista es obligatorio para envíos por encomienda' }, { status: 400 });
  }
  const lineas = Array.isArray(items)
    ? items.filter((i) => i?.pedido_item_id && Number.isInteger(Number(i.cantidad)) && Number(i.cantidad) > 0)
    : [];
  if (lineas.length === 0) {
    return NextResponse.json({ error: 'Elegí al menos un producto a entregar' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('crear_entrega', {
    p_pedido_id: id,
    p_modalidad: modalidad,
    p_encomendista: modalidad === 'encomienda' ? encomendista : null,
    p_agencia_punto: agencia_punto ?? null,
    p_fecha_programada: fecha_programada || null,
    p_nota: nota ?? null,
    p_items: lineas.map((i) => ({ pedido_item_id: i.pedido_item_id, cantidad: Number(i.cantidad) })),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: statusDeErrorDb(error.code) });
  }

  return NextResponse.json(data, { status: 201 });
}
