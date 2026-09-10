import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('id, nombre, monto_acumulado_tarjeta, stickers_actuales, total_tarjetas_completadas, total_premios_ganados')
    .eq('id', id)
    .single();

  if (clienteError) {
    return NextResponse.json({ error: clienteError.message }, { status: 404 });
  }

  const { data: premios, error: premiosError } = await supabase
    .from('premios_stickers')
    .select('*')
    .eq('cliente_id', id)
    .order('fecha_ganado', { ascending: false });

  if (premiosError) {
    return NextResponse.json({ error: premiosError.message }, { status: 500 });
  }

  return NextResponse.json({
    estado_actual: {
      monto_acumulado_tarjeta: cliente.monto_acumulado_tarjeta,
      stickers_actuales: cliente.stickers_actuales,
    },
    historico: {
      total_tarjetas_completadas: cliente.total_tarjetas_completadas,
      total_premios_ganados: cliente.total_premios_ganados,
    },
    premios_ganados: premios ?? [],
  });
}
