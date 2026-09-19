export interface EstiloPlataforma {
  clases: string;
  emoji: string;
  // Ruta a un logo en /public/plataformas para las marcas conocidas; el
  // emoji se sigue usando en contextos de solo texto (mensaje de WhatsApp).
  logo?: string;
  // Hex sólido para superficies que no pueden usar clases de Tailwind
  // (barras de gráficos dibujadas con `style`).
  color: string;
}

// Colores reconocibles para las plataformas más usadas; cualquier otra
// (Cider, la que sea) cae en el estilo neutro por defecto — el campo sigue
// siendo texto libre, no una lista cerrada.
const ESTILOS: Record<string, EstiloPlataforma> = {
  shein: { clases: 'bg-pink-50 text-pink-700', emoji: '🩷', logo: '/plataformas/shein.svg', color: '#db2777' },
  temu: { clases: 'bg-orange-50 text-orange-700', emoji: '🧡', logo: '/plataformas/temu.svg', color: '#ea580c' },
  amazon: { clases: 'bg-sky-50 text-sky-700', emoji: '📦', logo: '/plataformas/amazon.svg', color: '#0284c7' },
  shopee: { clases: 'bg-amber-50 text-amber-700', emoji: '🟠', logo: '/plataformas/shopee.svg', color: '#d97706' },
};

const ESTILO_DEFAULT: EstiloPlataforma = { clases: 'bg-surface text-muted', emoji: '🛒', color: '#8a8398' };

export function estiloPlataforma(plataforma: string): EstiloPlataforma {
  const clave = plataforma.trim().toLowerCase();
  return ESTILOS[clave] ?? ESTILO_DEFAULT;
}

// Plataformas "conocidas" con marca propia — cualquier otra cae en el
// bucket "Otras" en los gráficos comparativos para no ensuciar la leyenda
// con texto libre poco frecuente.
export const PLATAFORMAS_PRINCIPALES = ['shein', 'temu', 'amazon'] as const;

// Los cupones de descuento de la tarjeta de fidelidad (premios_stickers)
// solo se pueden canjear en pedidos con al menos un artículo de estas
// plataformas — son las únicas donde Bandini recibe un cupón del proveedor
// que compensa el descuento.
const PLATAFORMAS_CON_CUPON = new Set(['shein', 'temu']);

export function plataformaAplicaCupon(plataforma: string): boolean {
  return PLATAFORMAS_CON_CUPON.has(plataforma.trim().toLowerCase());
}
