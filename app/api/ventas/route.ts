import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { parsePaginacion } from '@/lib/utils/pagination';

function mapVenta(row: Record<string, unknown>) {
  const { cliente, items, ...venta } = row as {
    cliente?: { nombre: string } | null;
    items?: { producto?: { nombre: string } | null; [key: string]: unknown }[];
    [key: string]: unknown;
  };
  return {
    ...venta,
    cliente_nombre: cliente?.nombre ?? null,
    items: (items ?? []).map(({ producto, ...item }) => ({
      ...item,
      producto_nombre: producto?.nombre ?? null,
    })),
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const clienteId = params.get('cliente_id');
  const clienteNombre = params.get('cliente')?.trim();
  const productoNombre = params.get('producto')?.trim();
  const search = params.get('search')?.trim().replace(/[,()]/g, '');
  const metodoPago = params.get('metodo_pago');
  const fecha = params.get('fecha');
  const desde = params.get('desde');
  const hasta = params.get('hasta');
  const paginado = params.has('page');

  const supabase = createSupabaseAdminClient();

  function respuestaVacia() {
    if (!paginado) return NextResponse.json([]);
    const { page, pageSize } = parsePaginacion(params);
    return NextResponse.json({ data: [], total: 0, page, pageSize, resumen: { totalMonto: 0, unidades: 0 } });
  }

  async function idsPorNombre(tabla: 'clientes' | 'productos', nombre: string) {
    const { data } = await supabase.from(tabla).select('id').ilike('nombre', `%${nombre}%`);
    return (data ?? []).map((r) => r.id as string);
  }

  // Resuelve nombres de producto a los ids de las ventas (cabecera) que
  // incluyen ese producto en alguno de sus items.
  async function ventaIdsPorProducto(productoIds: string[]) {
    const { data } = await supabase.from('venta_items').select('venta_id').in('producto_id', productoIds);
    return [...new Set((data ?? []).map((r) => r.venta_id as string))];
  }

  let clienteIds: string[] | null = null;
  if (clienteNombre) {
    clienteIds = await idsPorNombre('clientes', clienteNombre);
    if (clienteIds.length === 0) return respuestaVacia();
  }

  let ventaIdsDeProducto: string[] | null = null;
  if (productoNombre) {
    const productoIds = await idsPorNombre('productos', productoNombre);
    ventaIdsDeProducto = productoIds.length ? await ventaIdsPorProducto(productoIds) : [];
    if (ventaIdsDeProducto.length === 0) return respuestaVacia();
  }

  // Búsqueda unificada: coincide por nombre de cliente O de producto.
  let searchOr: string | null = null;
  if (search) {
    const [cli, prodIds] = await Promise.all([idsPorNombre('clientes', search), idsPorNombre('productos', search)]);
    const ventaIdsProd = prodIds.length ? await ventaIdsPorProducto(prodIds) : [];
    if (cli.length === 0 && ventaIdsProd.length === 0) return respuestaVacia();
    const partes: string[] = [];
    if (cli.length) partes.push(`cliente_id.in.(${cli.join(',')})`);
    if (ventaIdsProd.length) partes.push(`id.in.(${ventaIdsProd.join(',')})`);
    searchOr = partes.join(',');
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const aplicarFiltros = (query: any): any => {
    let q = query;
    if (clienteId) q = q.eq('cliente_id', clienteId);
    if (clienteIds) q = q.in('cliente_id', clienteIds);
    if (ventaIdsDeProducto) q = q.in('id', ventaIdsDeProducto);
    if (searchOr) q = q.or(searchOr);
    if (metodoPago) q = q.eq('metodo_pago', metodoPago);
    if (fecha) q = q.gte('fecha', `${fecha}T00:00:00`).lte('fecha', `${fecha}T23:59:59.999`);
    if (desde) q = q.gte('fecha', `${desde}T00:00:00`);
    if (hasta) q = q.lte('fecha', `${hasta}T23:59:59.999`);
    return q;
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const query = aplicarFiltros(
    supabase
      .from('ventas')
      .select('*, cliente:clientes(nombre), items:venta_items(*, producto:productos(nombre))', paginado ? { count: 'exact' } : undefined)
      .order('fecha', { ascending: false })
  );

  if (paginado) {
    const { page, pageSize, from, to } = parsePaginacion(params);
    const [{ data, error, count }, { data: todas, error: totalesError }] = await Promise.all([
      query.range(from, to),
      aplicarFiltros(supabase.from('ventas').select('id, total')),
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (totalesError) return NextResponse.json({ error: totalesError.message }, { status: 500 });

    const ventaIds = (todas ?? []).map((v: { id: string }) => v.id);
    const totalMonto = (todas ?? []).reduce((s: number, v: { total: number }) => s + Number(v.total), 0);

    let unidades = 0;
    if (ventaIds.length) {
      const { data: itemsTotales, error: itemsError } = await supabase
        .from('venta_items')
        .select('cantidad')
        .in('venta_id', ventaIds);
      if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });
      unidades = (itemsTotales ?? []).reduce((s: number, i: { cantidad: number }) => s + i.cantidad, 0);
    }

    return NextResponse.json({
      data: (data ?? []).map(mapVenta),
      total: count ?? 0,
      page,
      pageSize,
      resumen: { totalMonto, unidades },
    });
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(mapVenta));
}

interface ItemInput {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { cliente_id, metodo_pago, items } = body as { cliente_id?: string | null; metodo_pago?: string; items: ItemInput[] };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Debe incluir al menos un producto' }, { status: 400 });
  }

  for (const item of items) {
    if (!item.producto_id) {
      return NextResponse.json({ error: 'Cada producto requiere producto_id' }, { status: 400 });
    }
    if (!(item.cantidad > 0)) {
      return NextResponse.json({ error: 'cantidad debe ser mayor a 0 en todos los productos' }, { status: 400 });
    }
    if (!(item.precio_unitario > 0)) {
      return NextResponse.json({ error: 'precio_unitario debe ser mayor a 0 en todos los productos' }, { status: 400 });
    }
    if ((item.descuento ?? 0) < 0) {
      return NextResponse.json({ error: 'descuento no puede ser negativo' }, { status: 400 });
    }
  }

  const supabase = createSupabaseAdminClient();

  if (cliente_id) {
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', cliente_id)
      .single();
    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }
  }

  // Suma la cantidad pedida por producto (puede repetirse el mismo producto
  // en varias líneas del carrito) para validar el stock una sola vez por producto.
  const cantidadPorProducto = new Map<string, number>();
  for (const item of items) {
    cantidadPorProducto.set(item.producto_id, (cantidadPorProducto.get(item.producto_id) ?? 0) + item.cantidad);
  }

  const { data: productos, error: productosError } = await supabase
    .from('productos')
    .select('id, nombre, stock_actual, activo')
    .in('id', Array.from(cantidadPorProducto.keys()));

  if (productosError) {
    return NextResponse.json({ error: productosError.message }, { status: 500 });
  }

  const productosPorId = new Map((productos ?? []).map((p) => [p.id, p]));

  for (const [productoId, cantidadTotal] of cantidadPorProducto) {
    const producto = productosPorId.get(productoId);
    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    if (!producto.activo) {
      return NextResponse.json({ error: `El producto "${producto.nombre}" no está activo` }, { status: 409 });
    }
    if (producto.stock_actual < cantidadTotal) {
      return NextResponse.json(
        { error: `Stock insuficiente de "${producto.nombre}": disponible ${producto.stock_actual}, solicitado ${cantidadTotal}` },
        { status: 409 }
      );
    }
  }

  const itemsPreparados = items.map((item) => {
    const descuento = item.descuento ?? 0;
    const total = item.precio_unitario * item.cantidad - descuento;
    return {
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      descuento,
      total,
    };
  });

  if (itemsPreparados.some((i) => !(i.total > 0))) {
    return NextResponse.json({ error: 'El total calculado debe ser mayor a 0 en todos los productos' }, { status: 400 });
  }

  // La venta se crea como una sola cabecera con N items en una única
  // transacción (función crear_venta en la base de datos): si una línea
  // falla, se revierte todo, incluyendo el ingreso/stickers que dispara la
  // cabecera al crearse.
  const { data: venta, error: ventaError } = (await supabase
    .rpc('crear_venta', {
      p_cliente_id: cliente_id ?? null,
      p_metodo_pago: metodo_pago ?? null,
      p_items: itemsPreparados,
    })
    .single()) as {
    data: { id: string; cliente_id: string | null; metodo_pago: string | null; total: number; fecha: string } | null;
    error: { code?: string; message: string } | null;
  };

  if (ventaError || !venta) {
    const status = ventaError?.code === '23514' ? 409 : 500;
    return NextResponse.json({ error: ventaError?.message ?? 'Error al crear la venta' }, { status });
  }

  const { data: ventaItems } = await supabase.from('venta_items').select('*').eq('venta_id', venta.id);

  let clienteActualizado = null;
  if (cliente_id) {
    ({ data: clienteActualizado } = await supabase.from('clientes').select('*').eq('id', cliente_id).single());
  }

  return NextResponse.json({ venta: { ...venta, items: ventaItems ?? [] }, cliente: clienteActualizado }, { status: 201 });
}
