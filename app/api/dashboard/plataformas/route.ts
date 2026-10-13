import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { anioActual, mesesDelAnio } from '@/lib/utils/charts';
import { PLATAFORMAS_PRINCIPALES } from '@/lib/utils/plataformas';

// Comparativa mensual (enero-diciembre) de ingresos por plataforma
// (Shein/Temu/Amazon) para un año dado. Se agrega en JS a partir
// de pedido_items — no hay una vista SQL porque el volumen de pedidos es chico.
// La plataforma vive en el pedido; pedido_items.plataforma_origen solo se usa
// para pedidos viejos que quedaron sin plataforma asignada.

function normalizarPlataforma(p: string | null): string {
  const clave = (p ?? '').trim().toLowerCase();
  return (PLATAFORMAS_PRINCIPALES as readonly string[]).includes(clave) ? clave : 'otras';
}

export async function GET(request: NextRequest) {
  const anioParam = Number(request.nextUrl.searchParams.get('anio'));
  const anio = Number.isInteger(anioParam) && anioParam >= 2000 && anioParam <= 2100 ? anioParam : anioActual();

  const meses = mesesDelAnio(anio);
  const desde = new Date(anio, 0, 1);
  const hasta = new Date(anio, 11, 31, 23, 59, 59, 999);
  const iso = (d: Date) => d.toISOString();

  const supabase = createSupabaseAdminClient();

  const { data: pedidos, error: errPedidos } = await supabase
    .from('pedidos')
    .select('id, fecha_creacion, plataforma')
    .gte('fecha_creacion', iso(desde))
    .lte('fecha_creacion', iso(hasta));

  if (errPedidos) {
    return NextResponse.json({ error: errPedidos.message }, { status: 500 });
  }

  const mesPorPedido = new Map<string, string>();
  const plataformaPorPedido = new Map<string, string | null>();
  for (const p of pedidos ?? []) {
    plataformaPorPedido.set(p.id, p.plataforma);
    const f = new Date(p.fecha_creacion);
    mesPorPedido.set(p.id, `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`);
  }

  const idsPedidos = [...mesPorPedido.keys()];

  const { data: items, error: errItems } =
    idsPedidos.length === 0
      ? { data: [], error: null }
      : await supabase.from('pedido_items').select('pedido_id, plataforma_origen, precio_venta, cantidad, monto_reembolsado').in('pedido_id', idsPedidos);

  if (errItems) {
    return NextResponse.json({ error: errItems.message }, { status: 500 });
  }

  const plataformasEncontradas = new Set<string>();
  // mes -> plataforma -> total
  const acumulado = new Map<string, Map<string, number>>(meses.map((m) => [m, new Map()]));

  for (const it of items ?? []) {
    const mes = mesPorPedido.get(it.pedido_id);
    if (!mes) continue;
    const plataforma = normalizarPlataforma(plataformaPorPedido.get(it.pedido_id) ?? it.plataforma_origen);
    plataformasEncontradas.add(plataforma);
    const porMes = acumulado.get(mes)!;
    porMes.set(plataforma, (porMes.get(plataforma) ?? 0) + Number(it.precio_venta) * it.cantidad - Number(it.monto_reembolsado));
  }

  // Orden fijo con las 4 principales siempre presentes (aunque no tengan
  // datos este rango, para que la leyenda no "salte" de mes a mes) y
  // "otras" al final solo si de verdad hay artículos fuera de esas 4.
  const plataformas: string[] = [
    ...PLATAFORMAS_PRINCIPALES,
    ...(plataformasEncontradas.has('otras') ? ['otras'] : []),
  ];

  const datos = meses.map((mes) => {
    const porMes = acumulado.get(mes)!;
    const fila: Record<string, number | string> = { mes };
    let total = 0;
    for (const p of plataformas) {
      const monto = porMes.get(p) ?? 0;
      fila[p] = monto;
      total += monto;
    }
    fila.total = total;
    return fila;
  });

  return NextResponse.json({ anio, meses, plataformas, datos });
}
