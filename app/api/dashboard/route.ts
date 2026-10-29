import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { mesActual } from '@/lib/utils/charts';
import { ESTADOS_PEDIDO_CERRADOS } from '@/lib/utils/pedidos';

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

type ProductoInfo = { nombre?: string | null; imagen_url?: string | null; precio_costo?: number | string | null };
type ProductoVenta = ProductoInfo | ProductoInfo[] | null;

function datosProducto(p: ProductoVenta): { nombre: string; imagen_url: string | null } {
  const info = Array.isArray(p) ? p[0] : p;
  return { nombre: info?.nombre ?? 'Producto eliminado', imagen_url: info?.imagen_url ?? null };
}

function costoProducto(p: ProductoVenta): number {
  const info = Array.isArray(p) ? p[0] : p;
  return Number(info?.precio_costo ?? 0);
}

// Pedidos que no cuentan para la ganancia: una cotización todavía no es una
// venta y un cancelado no movió producto.
const ESTADOS_SIN_GANANCIA = ['cotizacion', 'cancelado'];

export async function GET(request: NextRequest) {
  const mesParam = request.nextUrl.searchParams.get('mes');
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : mesActual();
  const r = rangoMes(mes);
  const supabase = createSupabaseAdminClient();

  const [
    txMes,
    txPrev,
    ventasMes,
    ventasPrev,
    itemsVentas,
    clientes,
    productos,
    notificaciones,
    pedidos,
    pedidosGanancia,
  ] = await Promise.all([
    supabase.from('transacciones').select('tipo, categoria, monto, fecha').gte('fecha', r.desde).lte('fecha', r.hasta),
    supabase.from('transacciones').select('tipo, monto').gte('fecha', r.desdePrev).lte('fecha', r.hastaPrev),
    supabase.from('ventas').select('total').gte('fecha', r.desde).lte('fecha', r.hasta),
    supabase.from('ventas').select('total').gte('fecha', r.desdePrev).lte('fecha', r.hastaPrev),
    supabase
      .from('venta_items')
      .select('producto_id, cantidad, total, producto:productos(nombre, imagen_url, precio_costo), venta:ventas!inner(fecha)')
      .gte('venta.fecha', r.desdePrev)
      .lte('venta.fecha', r.hasta),
    supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('productos').select('stock_actual, stock_minimo').eq('activo', true),
    supabase.from('notificaciones_admin').select('*', { count: 'exact', head: true }).eq('visto', false),
    supabase
      .from('pedidos')
      .select('saldo_pendiente')
      .not('estado', 'in', `(${ESTADOS_PEDIDO_CERRADOS.join(',')})`),
    supabase
      .from('pedidos')
      .select('id, fecha_creacion')
      .gte('fecha_creacion', r.desdePrev)
      .lte('fecha_creacion', r.hasta)
      .not('estado', 'in', `(${ESTADOS_SIN_GANANCIA.join(',')})`),
  ]);

  const conError = [
    txMes,
    txPrev,
    ventasMes,
    ventasPrev,
    itemsVentas,
    clientes,
    productos,
    notificaciones,
    pedidos,
    pedidosGanancia,
  ].find((res) => res.error);
  if (conError?.error) {
    return NextResponse.json({ error: conError.error.message }, { status: 500 });
  }

  // Rentabilidad de cada pedido (vista v_pedidos_rentabilidad): lo vendido
  // menos lo pagado en la plataforma (neto de sus reembolsos) y el envío. Lo
  // que el cliente paga por el producto se va a la plataforma; al negocio
  // solo le queda la ganancia.
  const idsPedidos = (pedidosGanancia.data ?? []).map((p) => p.id);
  const rentabilidad = idsPedidos.length
    ? await supabase
        .from('v_pedidos_rentabilidad')
        .select('pedido_id, ventas, ganancia, productos_sin_costo')
        .in('pedido_id', idsPedidos)
    : { data: [], error: null };
  if (rentabilidad.error) {
    return NextResponse.json({ error: rentabilidad.error.message }, { status: 500 });
  }
  const rentaPorPedido = new Map((rentabilidad.data ?? []).map((x) => [x.pedido_id, x]));

  // Cubetas por día del mes (día 1..N) con las métricas que consumen los
  // gráficos: ingresos/egresos (caja) y su detalle por categoría para el flujo
  // y los movimientos del mes, y la ganancia de tienda/pedidos para la
  // composición de la ganancia.
  const dias = Array.from({ length: r.dias }, (_, i) => ({
    dia: i + 1,
    ingresos: 0,
    egresos: 0,
    movimientos: [] as { tipo: 'ingreso' | 'egreso'; categoria: string | null; monto: number }[],
    gananciaPedidos: 0,
    gananciaTienda: 0,
  }));

  // Las consultas de ganancia traen el mes pedido y el anterior (para el
  // delta); esto separa uno de otro.
  const enMes = (fecha: string) => {
    const d = new Date(fecha);
    return d.getFullYear() === r.anio && d.getMonth() + 1 === r.mesNum;
  };

  const ganancia = { pedidos: 0, tienda: 0, vendido: 0, pedidosPrev: 0, tiendaPrev: 0, productosSinCosto: 0 };

  for (const p of pedidosGanancia.data ?? []) {
    const renta = rentaPorPedido.get(p.id);
    if (!renta) continue;
    const g = Number(renta.ganancia);
    if (enMes(p.fecha_creacion)) {
      ganancia.pedidos += g;
      ganancia.vendido += Number(renta.ventas);
      ganancia.productosSinCosto += Number(renta.productos_sin_costo);
      const dia = dias[new Date(p.fecha_creacion).getDate() - 1];
      if (dia) dia.gananciaPedidos += g;
    } else {
      ganancia.pedidosPrev += g;
    }
  }

  // Tienda: lo vendido menos el costo actual del producto en inventario.
  const itemsVentasMes: NonNullable<typeof itemsVentas.data> = [];
  for (const v of itemsVentas.data ?? []) {
    const fecha = (Array.isArray(v.venta) ? v.venta[0] : v.venta)?.fecha as string | undefined;
    if (!fecha) continue;
    const g = Number(v.total) - v.cantidad * costoProducto(v.producto as ProductoVenta);
    if (enMes(fecha)) {
      itemsVentasMes.push(v);
      ganancia.tienda += g;
      ganancia.vendido += Number(v.total);
      const dia = dias[new Date(fecha).getDate() - 1];
      if (dia) dia.gananciaTienda += g;
    } else {
      ganancia.tiendaPrev += g;
    }
  }

  for (const t of txMes.data ?? []) {
    const idx = new Date(t.fecha).getDate() - 1;
    const dia = dias[idx];
    if (!dia) continue;
    const monto = Number(t.monto);
    if (t.tipo === 'ingreso') dia.ingresos += monto;
    else dia.egresos += monto;
    const mov = dia.movimientos.find((m) => m.tipo === t.tipo && m.categoria === t.categoria);
    if (mov) mov.monto += monto;
    else dia.movimientos.push({ tipo: t.tipo, categoria: t.categoria, monto });
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
  for (const v of itemsVentasMes) {
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
      gananciaMes: ganancia.pedidos + ganancia.tienda,
      gananciaMesPrev: ganancia.pedidosPrev + ganancia.tiendaPrev,
      gananciaPedidos: ganancia.pedidos,
      gananciaTienda: ganancia.tienda,
      vendidoMes: ganancia.vendido,
      productosSinCosto: ganancia.productosSinCosto,
    },
    dias,
    topProductos,
  });
}
