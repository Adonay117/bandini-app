import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

// Ajuste del producto con el CLIENTE (no con la plataforma — eso son las
// devoluciones del módulo de embarques):
//   - cambio: (legado, sin embarque) se reemplaza el artículo por otro.
//   - reembolso_total / reembolso_parcial: se le devuelve dinero ya abonado.
//   - descuento: se le rebaja lo que debe, sin mover dinero.
// Aplica a productos defectuosos (legado) o con resultado logístico que
// afecta al cliente: con incidencia, en devolución, reembolsado por la
// plataforma, pendiente de reposición o desistido.
const ESTADOS_AJUSTABLES = ['defectuoso', 'con_incidencia', 'en_devolucion', 'pendiente_reposicion', 'reembolsado', 'desistido', 'recibido_parcial'];

interface DefectoInput {
  resolucion: 'cambio' | 'reembolso_total' | 'reembolso_parcial' | 'descuento';
  monto_reembolso?: number;
  nombre?: string;
  precio_venta?: number;
  url?: string;
  imagen_url?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const body = (await request.json()) as DefectoInput;
  const { resolucion } = body;

  if (!['cambio', 'reembolso_total', 'reembolso_parcial', 'descuento'].includes(resolucion)) {
    return NextResponse.json({ error: 'resolucion inválida' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: item, error: itemError } = await supabase
    .from('pedido_items')
    .select('*')
    .eq('id', itemId)
    .eq('pedido_id', id)
    .single();

  if (itemError || !item) {
    return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404 });
  }
  if (!ESTADOS_AJUSTABLES.includes(item.estado_item)) {
    return NextResponse.json(
      { error: 'Solo se ajustan con el cliente productos defectuosos o con incidencia, devolución, reembolso o desistimiento' },
      { status: 409 }
    );
  }

  const { data: log } = await supabase
    .from('v_pedido_items_logistica')
    .select('cantidad_embarcada, cantidad_entregada')
    .eq('pedido_item_id', itemId)
    .maybeSingle();
  const tieneLogistica = Boolean(log && (log.cantidad_embarcada > 0 || log.cantidad_entregada > 0));

  if (resolucion === 'cambio') {
    if (tieneLogistica) {
      return NextResponse.json(
        { error: 'Este producto ya viajó en un embarque: pedí la reposición a la plataforma desde el embarque.' },
        { status: 409 }
      );
    }
    if (!body.nombre?.trim()) {
      return NextResponse.json({ error: 'nombre es obligatorio para registrar el cambio' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('pedido_items')
      .update({
        nombre: body.nombre.trim(),
        precio_venta: body.precio_venta != null ? body.precio_venta : item.precio_venta,
        url: body.url?.trim() || null,
        imagen_url: body.imagen_url || null,
        estado_item: 'comprado',
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Reembolsos: requieren dinero real ya cobrado en este pedido. El saldo
  // disponible a reembolsar es el precio del artículo MENOS lo ya
  // reembolsado antes (por si el artículo tuvo un reembolso parcial previo).
  const disponibleReembolso =
    Number(item.precio_venta) * Number(item.cantidad) - Number(item.monto_reembolsado ?? 0);
  const montoReembolso = resolucion === 'reembolso_total' ? disponibleReembolso : Number(body.monto_reembolso);

  if (!(montoReembolso > 0)) {
    return NextResponse.json({ error: 'El artículo ya no tiene saldo a reembolsar' }, { status: 400 });
  }
  if (montoReembolso > disponibleReembolso) {
    return NextResponse.json({ error: 'El monto a reembolsar no puede superar el saldo disponible del artículo' }, { status: 400 });
  }

  // Descuento: se rebaja lo que el cliente debe, sin devolver dinero; por
  // eso no puede superar su saldo pendiente.
  if (resolucion === 'descuento') {
    const { data: pedido } = await supabase.from('pedidos').select('saldo_pendiente').eq('id', id).single();
    if (montoReembolso > Number(pedido?.saldo_pendiente ?? 0)) {
      return NextResponse.json(
        { error: 'El descuento supera el saldo pendiente del cliente; usá un reembolso para devolver lo ya abonado.' },
        { status: 409 }
      );
    }
    const { data, error } = await supabase
      .from('pedido_items')
      .update({ monto_reembolsado: Number(item.monto_reembolsado ?? 0) + montoReembolso })
      .eq('id', itemId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // No se toca `precio_venta`: si el artículo se vuelve a editar después (Editar
  // artículo, Cambio de producto), no debe perder el reembolso ya aplicado.
  // recalcular_totales_pedido() siempre resta monto_reembolsado del precio
  // vigente, sin importar qué valor tenga `precio` en ese momento.
  // Con logística, el estado del producto lo sigue calculando la base de
  // datos; sin ella (legado) se cierra como antes.
  const { error: itemUpdateError } = await supabase
    .from('pedido_items')
    .update({
      monto_reembolsado: Number(item.monto_reembolsado ?? 0) + montoReembolso,
      ...(tieneLogistica ? {} : { estado_item: resolucion === 'reembolso_total' ? 'no_disponible' : 'entregado' }),
    })
    .eq('id', itemId);

  if (itemUpdateError) {
    return NextResponse.json({ error: itemUpdateError.message }, { status: 500 });
  }

  const { data: abono, error: abonoError } = await supabase
    .from('abonos_pedido')
    .insert({ pedido_id: id, monto: montoReembolso, tipo: 'reembolso', metodo_pago: null })
    .select()
    .single();

  if (abonoError) {
    // 23514 = check_violation: típicamente total_abonado no puede quedar negativo,
    // es decir, se intenta reembolsar más de lo que el cliente ha abonado.
    const status = abonoError.code === '23514' ? 409 : 500;
    const message =
      abonoError.code === '23514'
        ? 'No se puede reembolsar más de lo que el cliente ha abonado en este pedido'
        : abonoError.message;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json(abono, { status: 201 });
}
