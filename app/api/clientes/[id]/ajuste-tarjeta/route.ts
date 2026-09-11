import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

// Ajuste manual del progreso de la tarjeta de fidelidad de un cliente, sin
// pasar por una venta. Sirve para cargar el historial previo al sistema o
// corregir un error puntual.
//
// Escribe DIRECTO en `clientes` (y opcionalmente inserta filas en
// `premios_stickers`): NO dispara ningún trigger, así que no genera
// transacciones, notificaciones ni movimientos de inventario. La lógica de
// fidelidad exige stickers = floor(monto/50), así que los stickers se
// derivan acá y no se reciben del cliente.

interface PremioHistorico {
  monto: 12 | 25;
  estado: 'canjeado' | 'disponible';
  fecha: string; // YYYY-MM-DD
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const monto = Number(body.monto_acumulado_tarjeta);
  const tarjetas = Number(body.total_tarjetas_completadas);
  const premiosGanados = Number(body.total_premios_ganados);
  const gastoInput = body.total_moneda_gastada;
  const premios: PremioHistorico[] = Array.isArray(body.premios) ? body.premios : [];

  if (!(monto >= 0) || monto >= 500) {
    return NextResponse.json(
      { error: 'El monto acumulado debe estar entre 0 y 499.99 (la tarjeta se reinicia a los 10 stickers).' },
      { status: 400 }
    );
  }
  if (!Number.isInteger(tarjetas) || tarjetas < 0) {
    return NextResponse.json({ error: 'Tarjetas completadas debe ser un entero ≥ 0.' }, { status: 400 });
  }
  if (!Number.isInteger(premiosGanados) || premiosGanados < 0) {
    return NextResponse.json({ error: 'Premios ganados debe ser un entero ≥ 0.' }, { status: 400 });
  }
  if (gastoInput != null && !(Number(gastoInput) >= 0)) {
    return NextResponse.json({ error: 'Total gastado histórico inválido.' }, { status: 400 });
  }
  for (const p of premios) {
    if (p.monto !== 12 && p.monto !== 25) {
      return NextResponse.json({ error: 'Cada premio histórico debe ser de $12 o $25.' }, { status: 400 });
    }
    if (p.estado !== 'canjeado' && p.estado !== 'disponible') {
      return NextResponse.json({ error: 'Estado de premio histórico inválido.' }, { status: 400 });
    }
    if (typeof p.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.fecha)) {
      return NextResponse.json({ error: 'Fecha de premio histórico inválida.' }, { status: 400 });
    }
  }

  const supabase = createSupabaseAdminClient();

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', id)
    .single();
  if (clienteError || !cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  const stickers = Math.floor(monto / 50);
  const gastoHistorico = gastoInput != null ? Number(gastoInput) : tarjetas * 500 + monto;

  const { data: actualizado, error: updateError } = await supabase
    .from('clientes')
    .update({
      monto_acumulado_tarjeta: monto,
      stickers_actuales: stickers,
      total_tarjetas_completadas: tarjetas,
      total_premios_ganados: premiosGanados,
      total_moneda_gastada: gastoHistorico,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (premios.length > 0) {
    const filas = premios.map((p) => ({
      cliente_id: id,
      stickers_alcanzados: p.monto === 25 ? 10 : 5,
      premio_monto: p.monto,
      monto_acumulado_cuando_gano: p.monto === 25 ? 500 : 250,
      estado_canje: p.estado,
      // 'canjeado' => cubierto_por_cupon evita cualquier egreso; de todos
      // modos el INSERT no dispara el trigger (es AFTER UPDATE).
      cubierto_por_cupon: p.estado === 'canjeado',
      fecha_ganado: `${p.fecha}T12:00:00`,
      fecha_canjeado: p.estado === 'canjeado' ? `${p.fecha}T12:00:00` : null,
    }));
    const { error: premiosError } = await supabase.from('premios_stickers').insert(filas);
    if (premiosError) {
      return NextResponse.json(
        { error: `Se actualizó el cliente, pero falló al registrar los premios: ${premiosError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(actualizado);
}
