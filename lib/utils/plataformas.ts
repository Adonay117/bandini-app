export interface EstiloPlataforma {
  clases: string;
  emoji: string;
  // Ruta a un logo en /public/plataformas para las marcas conocidas; el
  // emoji se sigue usando en contextos de solo texto (mensaje de WhatsApp).
  logo?: string;
}

// Colores reconocibles para las plataformas más usadas; cualquier otra
// (Cider, la que sea) cae en el estilo neutro por defecto — el campo sigue
// siendo texto libre, no una lista cerrada.
const ESTILOS: Record<string, EstiloPlataforma> = {
  shein: { clases: 'bg-pink-50 text-pink-700', emoji: '🩷', logo: '/plataformas/shein.svg' },
  temu: { clases: 'bg-orange-50 text-orange-700', emoji: '🧡', logo: '/plataformas/temu.svg' },
  amazon: { clases: 'bg-sky-50 text-sky-700', emoji: '📦', logo: '/plataformas/amazon.svg' },
  aliexpress: { clases: 'bg-red-50 text-red-700', emoji: '🔴', logo: '/plataformas/aliexpress.svg' },
  shopee: { clases: 'bg-amber-50 text-amber-700', emoji: '🟠', logo: '/plataformas/shopee.svg' },
};

const ESTILO_DEFAULT: EstiloPlataforma = { clases: 'bg-surface text-muted', emoji: '🛒' };

export function estiloPlataforma(plataforma: string): EstiloPlataforma {
  const clave = plataforma.trim().toLowerCase();
  return ESTILOS[clave] ?? ESTILO_DEFAULT;
}

// Los cupones de descuento de la tarjeta de fidelidad (premios_stickers)
// solo se pueden canjear en pedidos con al menos un artículo de estas
// plataformas — son las únicas donde Bandini recibe un cupón del proveedor
// que compensa el descuento.
const PLATAFORMAS_CON_CUPON = new Set(['shein', 'temu']);

export function plataformaAplicaCupon(plataforma: string): boolean {
  return PLATAFORMAS_CON_CUPON.has(plataforma.trim().toLowerCase());
}
