const PALETA = [
  { bg: '#ece8f6', fg: '#3f365b' },
  { bg: '#e4f4ec', fg: '#1f8a5b' },
  { bg: '#fbf0e0', fg: '#b06f1e' },
  { bg: '#e8e3f6', fg: '#5a4b8a' },
  { bg: '#fbe9e8', fg: '#c8453f' },
  { bg: '#e0eef5', fg: '#2c6a8f' },
];

const DIMS = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primera = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primera + ultima).toUpperCase();
}

export function ClienteAvatar({ nombre, size = 'md' }: { nombre: string; size?: keyof typeof DIMS }) {
  const color = PALETA[hash(nombre) % PALETA.length];
  return (
    <span
      className={`flex ${DIMS[size]} shrink-0 items-center justify-center rounded-full font-semibold select-none`}
      style={{ backgroundColor: color.bg, color: color.fg }}
      aria-hidden="true"
    >
      {iniciales(nombre)}
    </span>
  );
}
