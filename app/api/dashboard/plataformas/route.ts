import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { anioActual, mesesDelAnio } from '@/lib/utils/charts';
import { PLATAFORMAS_PRINCIPALES } from '@/lib/utils/plataformas';

// Una cotización todavía no es una venta y un cancelado no movió producto.
const ESTADOS_SIN_GANANCIA = ['cotizacion', 'cancelado'];

// Comparativa mensual (enero-diciembre) de la ganancia neta por plataforma
// (Shein/Temu/Amazon) para un año dado: lo vendido menos lo pagado en la
// plataforma y el envío (vista v_pedidos_rentabilidad). Lo que el cliente paga
// por el producto se queda en la plataforma, así que no se cuenta como ingreso.
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
    .lte('fecha_creacion', iso(hasta))
    .not('estado', 'in', `(${ESTADOS_SIN_GANANCIA.join(',')})`);

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

  const [items, rentabilidad] =
    idsPedidos.length === 0
      ? [
          { data: [], error: null },
          { data: [], error: null },
        ]
      : await Promise.all([
          // Solo para la plataforma de los pedidos viejos sin plataforma.
          supabase.from('pedido_items').select('pedido_id, plataforma_origen').in('pedido_id', idsPedidos),
          supabase.from('v_pedidos_rentabilidad').select('pedido_id, ganancia, ventas').in('pedido_id', idsPedidos),
        ]);

  const errConsulta = items.error ?? rentabilidad.error;
  if (errConsulta) {
    return NextResponse.json({ error: errConsulta.message }, { status: 500 });
  }

  const origenPorPedido = new Map<string, string | null>();
  for (const it of items.data ?? []) {
    if (!origenPorPedido.has(it.pedido_id)) origenPorPedido.set(it.pedido_id, it.plataforma_origen);
  }

  const plataformasEncontradas = new Set<string>();
  // mes -> plataforma -> ganancia
  const acumulado = new Map<string, Map<string, number>>(meses.map((m) => [m, new Map()]));
  // mes -> plataforma -> precio de venta (lo que se le cobró al cliente)
  const acumuladoVentas = new Map<string, Map<string, number>>(meses.map((m) => [m, new Map()]));

  for (const renta of rentabilidad.data ?? []) {
    const mes = mesPorPedido.get(renta.pedido_id);
    if (!mes) continue;
    const plataforma = normalizarPlataforma(
      plataformaPorPedido.get(renta.pedido_id) ?? origenPorPedido.get(renta.pedido_id) ?? null
    );
    plataformasEncontradas.add(plataforma);
    const porMes = acumulado.get(mes)!;
    porMes.set(plataforma, (porMes.get(plataforma) ?? 0) + Number(renta.ganancia));
    const ventasMes = acumuladoVentas.get(mes)!;
    ventasMes.set(plataforma, (ventasMes.get(plataforma) ?? 0) + Number(renta.ventas));
  }

  // Orden fijo con las 4 principales siempre presentes (aunque no tengan
  // datos este rango, para que la leyenda no "salte" de mes a mes) y
  // "otras" al final solo si de verdad hay artículos fuera de esas 4.
  const plataformas: string[] = [
    ...PLATAFORMAS_PRINCIPALES,
    ...(plataformasEncontradas.has('otras') ? ['otras'] : []),
  ];

  const armarFilas = (fuente: Map<string, Map<string, number>>) =>
    meses.map((mes) => {
      const porMes = fuente.get(mes)!;
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

  return NextResponse.json({
    anio,
    meses,
    plataformas,
    datos: armarFilas(acumulado),
    datosVentas: armarFilas(acumuladoVentas),
  });
}
