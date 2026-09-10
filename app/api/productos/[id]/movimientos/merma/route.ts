import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const MOTIVOS = ['danado', 'vencido', 'roto', 'otro'] as const;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { cantidad, motivo, nota } = body as { cantidad: number; motivo: string; nota?: string };

  if (!(cantidad > 0)) {
    return NextResponse.json({ error: 'cantidad debe ser mayor a 0' }, { status: 400 });
  }
  if (!MOTIVOS.includes(motivo as (typeof MOTIVOS)[number])) {
    return NextResponse.json({ error: 'motivo inválido' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // reportar_merma_producto inserta el movimiento, descuenta stock_actual y
  // registra el egreso por el costo perdido de forma atómica (ver
  // 0007_merma_inventario.sql).
  const { error: rpcError } = await supabase.rpc('reportar_merma_producto', {
    p_producto_id: id,
    p_cantidad: cantidad,
    p_motivo: motivo,
    p_nota: nota?.trim() || null,
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const { data: producto, error: productoError } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .single();

  if (productoError) {
    return NextResponse.json({ error: productoError.message }, { status: 500 });
  }

  return NextResponse.json({ producto }, { status: 201 });
}
