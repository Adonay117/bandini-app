import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bandini SV — Admin',
    short_name: 'Bandini',
    description: 'Panel de administración: clientes, productos, ventas, stickers y pedidos.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#4d4260',
    theme_color: '#4d4260',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
