import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia'];

// Saldo a favor del cliente: plata recibida por adelantado, para pedidos que
// todavía no existen. GET expone el saldo actual + el historial de
// movimientos; POST registra una recarga (el trigger procesar_movimiento_
// saldo_favor se encarga del ingreso y de acumular stickers).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('saldo_favor')
    .eq('id', id)
    .single();
  if (clienteError || !cliente) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  const { data: movimientos, error: movimientosError } = await supabase
    .from('movimientos_saldo_favor')
    .select('*, pedido:pedidos(numero)')
    .eq('cliente_id', id)
    .order('fecha', { ascending: false });
  if (movimientosError) {
    return NextResponse.json({ error: movimientosError.message }, { status: 500 });
  }

  const historial = (movimientos ?? []).map(({ pedido, ...movimiento }) => ({
    ...movimiento,
    pedido_numero: pedido?.numero ?? null,
  }));

  return NextResponse.json({ saldo_favor: cliente.saldo_favor, movimientos: historial });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { monto, metodo_pago, nota } = body;

  if (!(monto > 0)) {
    return NextResponse.json({ error: 'monto debe ser mayor a 0' }, { status: 400 });
  }
  if (metodo_pago != null && !METODOS_PAGO.includes(metodo_pago)) {
    return NextResponse.json({ error: 'metodo_pago inválido' }, { status: 400 });
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

  const { error: insertError } = await supabase.from('movimientos_saldo_favor').insert({
    cliente_id: id,
    monto,
    motivo: 'recarga',
    metodo_pago: metodo_pago ?? null,
    nota: nota?.trim() || null,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: actualizado, error: updateError } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(actualizado, { status: 201 });
}
