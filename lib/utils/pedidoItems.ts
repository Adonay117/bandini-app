import { ESTADOS_ITEM_MANUALES } from '@/lib/utils/pedidos';

// Normaliza y valida los campos editables de un producto de pedido. Los
// estados logísticos (en tránsito, recibido, entregado…) nunca se aceptan:
// los calcula la base de datos.
export function parsearCamposItem(
  body: Record<string, unknown>,
  { parcial }: { parcial: boolean }
): { campos: Record<string, unknown>; error?: string } {
  const campos: Record<string, unknown> = {};

  if (body.nombre !== undefined || !parcial) {
    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    if (!nombre) return { campos, error: 'nombre es obligatorio' };
    campos.nombre = nombre;
  }
  if (body.cantidad !== undefined || !parcial) {
    const cantidad = body.cantidad === undefined ? 1 : Number(body.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) return { campos, error: 'cantidad debe ser un entero mayor a 0' };
    campos.cantidad = cantidad;
  }
  if (body.precio_venta !== undefined || !parcial) {
    const precio = Number(body.precio_venta);
    if (body.precio_venta == null || !(precio >= 0)) return { campos, error: 'precio_venta es obligatorio y no puede ser negativo' };
    campos.precio_venta = precio;
  }
  for (const campo of ['precio_compra', 'peso_lb'] as const) {
    if (body[campo] === undefined) continue;
    if (body[campo] === null || body[campo] === '') {
      campos[campo] = null;
      continue;
    }
    const valor = Number(body[campo]);
    if (!(valor >= 0)) return { campos, error: `${campo} no puede ser negativo` };
    campos[campo] = valor;
  }
  for (const campo of ['url', 'imagen_url'] as const) {
    if (body[campo] !== undefined) campos[campo] = typeof body[campo] === 'string' ? body[campo].trim() || null : null;
  }
  if (body.estado_item !== undefined) {
    if (!ESTADOS_ITEM_MANUALES.includes(body.estado_item as never)) {
      return { campos, error: `estado_item solo se puede fijar a: ${ESTADOS_ITEM_MANUALES.join(', ')}` };
    }
    campos.estado_item = body.estado_item;
  }

  return { campos };
}
