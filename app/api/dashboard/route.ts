import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { mesActual } from '@/lib/utils/charts';

// Un único endpoint que arma todo el dashboard: KPIs + series de los gráficos,
// ya agregados en el servidor y acotados al mes pedido. Reemplaza las 5
// llamadas que hacía la página (clientes, productos, ventas, transacciones,
// notificaciones) — cada una traía la tabla completa — por 1 sola con payload
// mínimo y constante sin importar cuánto crezcan las tablas.

function rangoMes(mes: string) {
  const [anio, m] = mes.split('-').map(Number);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const inicio = new Date(anio, m - 1, 1);
  const fin = new Date(anio, m, 0);
  const inicioPrev = new Date(anio, m - 2, 1);
  const finPrev = new Date(anio, m - 1, 0);
  return {
    anio,
    mesNum: m,
    dias: fin.getDate(),
    desde: `${iso(inicio)}T00:00:00`,
    hasta: `${iso(fin)}T23:59:59.999`,
    desdePrev: `${iso(inicioPrev)}T00:00:00`,
    hastaPrev: `${iso(finPrev)}T23:59:59.999`,
  };
}

type ProductoInfo = { nombre?: string | null; imagen_url?: string | null };
type ProductoVenta = ProductoInfo | ProductoInfo[] | null;

function datosProducto(p: ProductoVenta): { nombre: string; imagen_url: string | null } {
  const info = Array.isArray(p) ? p[0] : p;
  return { nombre: info?.nombre ?? 'Producto eliminado', imagen_url: info?.imagen_url ?? null };
}

export async function GET(request: NextRequest) {
  const mesParam = request.nextUrl.searchParams.get('mes');
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : mesActual();
  const r = rangoMes(mes);
  const supabase = createSupabaseAdminClient();

  const [txMes, txPrev, ventasMes, ventasPrev, itemsVentasMes, clientes, productos, notificaciones, pedidos] =
    await Promise.all([
      supabase.from('transacciones').select('tipo, categoria, monto, fecha').gte('fecha', r.desde).lte('fecha', r.hasta),
      supabase.from('transacciones').select('tipo, monto').gte('fecha', r.desdePrev).lte('fecha', r.hastaPrev),
      supabase.from('ventas').select('total').gte('fecha', r.desde).lte('fecha', r.hasta),
      supabase.from('ventas').select('total').gte('fecha', r.desdePrev).lte('fecha', r.hastaPrev),
      supabase
        .from('venta_items')
        .select('producto_id, cantidad, total, producto:productos(nombre, imagen_url), venta:ventas!inner(fecha)')
        .gte('venta.fecha', r.desde)
        .lte('venta.fecha', r.hasta),
      supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('productos').select('stock_actual, stock_minimo').eq('activo', true),
      supabase.from('notificaciones_admin').select('*', { count: 'exact', head: true }).eq('visto', false),
      supabase.from('pedidos').select('saldo_pendiente').neq('estado', 'completado'),
    ]);

  const conError = [txMes, txPrev, ventasMes, ventasPrev, itemsVentasMes, clientes, productos, notificaciones, pedidos].find(
    (res) => res.error
  );
  if (conError?.error) {
    return NextResponse.json({ error: conError.error.message }, { status: 500 });
  }

  // Cubetas por día del mes (día 1..N) con las 4 métricas que consumen los
  // gráficos: ingresos/egresos para el calendario de flujo y ventas/abonos
  // para la composición del ingreso.
  const dias = Array.from({ length: r.dias }, (_, i) => ({
    dia: i + 1,
    ingresos: 0,
    egresos: 0,
    ventas: 0,
    abonos: 0,
  }));

  for (const t of txMes.data ?? []) {
    const idx = new Date(t.fecha).getDate() - 1;
    const dia = dias[idx];
    if (!dia) continue;
    const monto = Number(t.monto);
    if (t.tipo === 'ingreso') {
      dia.ingresos += monto;
      if (t.categoria === 'venta') dia.ventas += monto;
      else if (t.categoria === 'abono_pedido' || t.categoria === 'saldo_favor') dia.abonos += monto;
    } else {
      dia.egresos += monto;
    }
  }

  const ingresosMes = dias.reduce((s, d) => s + d.ingresos, 0);
  const egresosMes = dias.reduce((s, d) => s + d.egresos, 0);

  const prev = (txPrev.data ?? []).reduce(
    (acc, t) => {
      if (t.tipo === 'ingreso') acc.ingresos += Number(t.monto);
      else acc.egresos += Number(t.monto);
      return acc;
    },
    { ingresos: 0, egresos: 0 }
  );

  const ventasMesMonto = (ventasMes.data ?? []).reduce((s, v) => s + Number(v.total), 0);
  const ventasPrevMonto = (ventasPrev.data ?? []).reduce((s, v) => s + Number(v.total), 0);

  const productosActivos = productos.data ?? [];
  const stockBajo = productosActivos.filter((p) => p.stock_actual <= p.stock_minimo).length;

  const pedidosActivos = pedidos.data ?? [];
  const saldoPorCobrar = pedidosActivos.reduce((s, p) => s + Number(p.saldo_pendiente ?? 0), 0);

  const acumProductos = new Map<
    string,
    { producto_id: string; nombre: string; imagen_url: string | null; cantidad: number; total: number }
  >();
  for (const v of itemsVentasMes.data ?? []) {
    const actual = acumProductos.get(v.producto_id) ?? {
      producto_id: v.producto_id,
      ...datosProducto(v.producto as ProductoVenta),
      cantidad: 0,
      total: 0,
    };
    actual.cantidad += v.cantidad;
    actual.total += Number(v.total);
    acumProductos.set(v.producto_id, actual);
  }
  const topProductos = [...acumProductos.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);

  return NextResponse.json({
    mes,
    kpis: {
      clientesActivos: clientes.count ?? 0,
      productosActivos: productosActivos.length,
      stockBajo,
      notificacionesPendientes: notificaciones.count ?? 0,
      pedidosActivos: pedidosActivos.length,
      saldoPorCobrar,
      ventasMes: { count: (ventasMes.data ?? []).length, monto: ventasMesMonto },
      ventasMesPrev: ventasPrevMonto,
      ingresosMes,
      egresosMes,
      balanceMes: ingresosMes - egresosMes,
      ingresosMesPrev: prev.ingresos,
      egresosMesPrev: prev.egresos,
    },
    dias,
    topProductos,
  });
}
