import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { plataformaAplicaCupon } from '@/lib/utils/plataformas';

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
  const { monto, metodo_pago, premio_id, cupon_proveedor, desde_saldo_favor } = body;

  const supabase = createSupabaseAdminClient();

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .select('id, cliente_id, total_pedido, total_abonado')
    .eq('id', id)
    .single();
  if (pedidoError || !pedido) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  // Tope de abono: nunca se deja que un abono infle el pedido más allá de su
  // saldo pendiente. Cualquier excedente (efectivo o premio) pasa al saldo a
  // favor del cliente (movimientos_saldo_favor) en vez de sumar de más aquí.
  const saldo = Number(pedido.total_pedido) - Number(pedido.total_abonado);

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

    // Los cupones de tarjeta solo aplican a pedidos con artículos Shein/Temu.
    const { data: items, error: itemsError } = await supabase
      .from('pedido_items')
      .select('plataforma')
      .eq('pedido_id', id);
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
    if (!(items ?? []).some((item) => plataformaAplicaCupon(item.plataforma))) {
      return NextResponse.json(
        { error: 'Los premios de tarjeta solo se canjean en pedidos con artículos de Shein o Temu.' },
        { status: 409 }
      );
    }

    if (saldo <= 0) {
      return NextResponse.json(
        { error: 'El pedido ya está saldado; el premio se puede usar en otro pedido.' },
        { status: 409 }
      );
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

    const aplicado = Math.min(Number(premio.premio_monto), saldo);
    const excedente = Number(premio.premio_monto) - aplicado;

    // El trigger procesar_abono_pedido marca el premio como canjeado (lo que
    // a su vez registra el egreso, salvo que esté cubierto por cupón) en vez
    // de sumar ingreso/stickers.
    const { data, error } = await supabase
      .from('abonos_pedido')
      .insert({ pedido_id: id, monto: aplicado, premio_id: premio.id, metodo_pago: null })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // El premio vale más que el saldo del pedido: el resto queda como saldo
    // a favor del cliente. es_cupon=true porque no es plata del cliente, así
    // que no debe generar ingreso ni stickers.
    if (excedente > 0) {
      const { error: excedenteError } = await supabase.from('movimientos_saldo_favor').insert({
        cliente_id: pedido.cliente_id,
        monto: excedente,
        motivo: 'excedente',
        es_cupon: true,
        pedido_id: id,
        abono_id: data.id,
      });
      if (excedenteError) {
        return NextResponse.json(
          { error: `El premio se canjeó, pero falló al registrar el excedente: ${excedenteError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ abono: data, excedente }, { status: 201 });
  }

  // Abono pagado con saldo a favor del cliente: la plata ya generó ingreso y
  // stickers cuando entró al saldo a favor, así que este abono solo mueve el
  // dinero de la billetera del cliente hacia el pedido.
  if (desde_saldo_favor) {
    if (!(monto > 0)) {
      return NextResponse.json({ error: 'monto debe ser mayor a 0' }, { status: 400 });
    }
    if (saldo <= 0) {
      return NextResponse.json({ error: 'El pedido ya está saldado' }, { status: 409 });
    }

    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('saldo_favor')
      .eq('id', pedido.cliente_id)
      .single();
    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
    if (Number(monto) > Number(cliente.saldo_favor)) {
      return NextResponse.json({ error: 'Saldo a favor insuficiente' }, { status: 409 });
    }
    if (Number(monto) > saldo) {
      return NextResponse.json({ error: 'El monto supera el saldo pendiente del pedido' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('abonos_pedido')
      .insert({ pedido_id: id, monto, metodo_pago: null, origen: 'saldo_favor' })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { error: saldoError } = await supabase.from('movimientos_saldo_favor').insert({
      cliente_id: pedido.cliente_id,
      monto: -Number(monto),
      motivo: 'aplicado_pedido',
      pedido_id: id,
      abono_id: data.id,
    });
    if (saldoError) {
      return NextResponse.json(
        { error: `El abono se registró, pero falló al descontar el saldo a favor: ${saldoError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ abono: data, excedente: 0 }, { status: 201 });
  }

  if (!(monto > 0)) {
    return NextResponse.json({ error: 'monto debe ser mayor a 0' }, { status: 400 });
  }

  const aplicado = Math.min(Number(monto), Math.max(saldo, 0));
  const excedente = Number(monto) - aplicado;

  let abono = null;
  if (aplicado > 0) {
    // El trigger procesar_abono_pedido registra el ingreso y acumula stickers.
    const { data, error } = await supabase
      .from('abonos_pedido')
      .insert({ pedido_id: id, monto: aplicado, metodo_pago: metodo_pago ?? null })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    abono = data;
  }

  // El abono supera el saldo pendiente: el excedente no infla el pedido,
  // pasa al saldo a favor del cliente (y también genera ingreso/stickers,
  // porque sigue siendo plata real que entregó el cliente).
  if (excedente > 0) {
    const { error: excedenteError } = await supabase.from('movimientos_saldo_favor').insert({
      cliente_id: pedido.cliente_id,
      monto: excedente,
      motivo: 'excedente',
      metodo_pago: metodo_pago ?? null,
      pedido_id: id,
      abono_id: abono?.id ?? null,
    });
    if (excedenteError) {
      return NextResponse.json(
        { error: `El abono se registró, pero falló al registrar el excedente: ${excedenteError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ abono, excedente }, { status: 201 });
}
