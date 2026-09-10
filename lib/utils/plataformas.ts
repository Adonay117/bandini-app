export interface EstiloPlataforma {
  clases: string;
  emoji: string;
}

// Colores reconocibles para las plataformas más usadas; cualquier otra
// (Shopee, Cider, AliExpress, la que sea) cae en el estilo neutro por
// defecto — el campo sigue siendo texto libre, no una lista cerrada.
const ESTILOS: Record<string, EstiloPlataforma> = {
  shein: { clases: 'bg-pink-50 text-pink-700', emoji: '🩷' },
  temu: { clases: 'bg-orange-50 text-orange-700', emoji: '🧡' },
  amazon: { clases: 'bg-sky-50 text-sky-700', emoji: '📦' },
  aliexpress: { clases: 'bg-red-50 text-red-700', emoji: '🔴' },
  shopee: { clases: 'bg-amber-50 text-amber-700', emoji: '🟠' },
};

const ESTILO_DEFAULT: EstiloPlataforma = { clases: 'bg-surface text-muted', emoji: '🛒' };

export function estiloPlataforma(plataforma: string): EstiloPlataforma {
  const clave = plataforma.trim().toLowerCase();
  return ESTILOS[clave] ?? ESTILO_DEFAULT;
}
