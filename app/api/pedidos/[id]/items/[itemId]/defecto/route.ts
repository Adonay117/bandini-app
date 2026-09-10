import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

interface DefectoInput {
  resolucion: 'cambio' | 'reembolso_total' | 'reembolso_parcial';
  monto_reembolso?: number;
  plataforma?: string;
  producto?: string;
  precio?: number;
  url?: string;
  imagen_url?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const body = (await request.json()) as DefectoInput;
  const { resolucion } = body;

  if (!['cambio', 'reembolso_total', 'reembolso_parcial'].includes(resolucion)) {
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
  if (item.estado_item !== 'defectuoso') {
    return NextResponse.json({ error: 'El artículo debe marcarse como defectuoso antes de resolverlo' }, { status: 409 });
  }

  if (resolucion === 'cambio') {
    if (!body.producto?.trim()) {
      return NextResponse.json({ error: 'producto es obligatorio para registrar el cambio' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('pedido_items')
      .update({
        plataforma: body.plataforma?.trim() || item.plataforma,
        producto: body.producto.trim(),
        precio: body.precio != null ? body.precio : item.precio,
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
  const disponibleReembolso = Number(item.precio) - Number(item.monto_reembolsado ?? 0);
  const montoReembolso = resolucion === 'reembolso_total' ? disponibleReembolso : Number(body.monto_reembolso);

  if (!(montoReembolso > 0)) {
    return NextResponse.json({ error: 'El artículo ya no tiene saldo a reembolsar' }, { status: 400 });
  }
  if (montoReembolso > disponibleReembolso) {
    return NextResponse.json({ error: 'El monto a reembolsar no puede superar el saldo disponible del artículo' }, { status: 400 });
  }

  // No se toca `precio`: si el artículo se vuelve a editar después (Editar
  // artículo, Cambio de producto), no debe perder el reembolso ya aplicado.
  // recalcular_totales_pedido() siempre resta monto_reembolsado del precio
  // vigente, sin importar qué valor tenga `precio` en ese momento.
  const { error: itemUpdateError } = await supabase
    .from('pedido_items')
    .update({
      monto_reembolsado: Number(item.monto_reembolsado ?? 0) + montoReembolso,
      estado_item: resolucion === 'reembolso_total' ? 'no_disponible' : 'entregado',
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
