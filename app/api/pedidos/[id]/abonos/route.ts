import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('abonos_pedido')
    .select('*')
    .eq('pedido_id', id)
    .order('fecha_abono', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { monto, metodo_pago, premio_id, cupon_proveedor } = body;

  const supabase = createSupabaseAdminClient();

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .select('id, cliente_id')
    .eq('id', id)
    .single();
  if (pedidoError || !pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  // Canje de premio como descuento: el monto lo determina el premio, no el usuario.
  if (premio_id) {
    const { data: premio, error: premioError } = await supabase
      .from('premios_stickers')
      .select('id, cliente_id, premio_monto, estado_canje')
      .eq('id', premio_id)
      .single();
    if (premioError || !premio) {
      return NextResponse.json({ error: 'Premio no encontrado' }, { status: 404 });
    }
    if (premio.cliente_id !== pedido.cliente_id) {
      return NextResponse.json({ error: 'El premio no pertenece al cliente de este pedido' }, { status: 409 });
    }
    if (premio.estado_canje !== 'disponible') {
      return NextResponse.json({ error: 'El premio ya fue canjeado' }, { status: 409 });
    }

    // Se registra primero si este canje lo cubre un cupón del proveedor
    // (Temu/Shein): el trigger registrar_egreso_premio_canjeado lo lee para
    // decidir si genera egreso o no cuando el premio se marca canjeado.
    const { error: cuponError } = await supabase
      .from('premios_stickers')
      .update({ cubierto_por_cupon: Boolean(cupon_proveedor) })
      .eq('id', premio_id);
    if (cuponError) {
      return NextResponse.json({ error: cuponError.message }, { status: 500 });
    }

    // El trigger procesar_abono_pedido marca el premio como canjeado (lo que
    // a su vez registra el egreso, salvo que esté cubierto por cupón) en vez
    // de sumar ingreso/stickers.
    const { data, error } = await supabase
      .from('abonos_pedido')
      .insert({ pedido_id: id, monto: premio.premio_monto, premio_id: premio.id, metodo_pago: null })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }

  if (!(monto > 0)) {
    return NextResponse.json({ error: 'monto debe ser mayor a 0' }, { status: 400 });
  }

  // El trigger procesar_abono_pedido registra el ingreso y acumula stickers.
  const { data, error } = await supabase
    .from('abonos_pedido')
    .insert({ pedido_id: id, monto, metodo_pago: metodo_pago ?? null })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
