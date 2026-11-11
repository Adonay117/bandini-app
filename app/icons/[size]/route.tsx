import { ImageResponse } from 'next/og';

// Íconos PNG de la PWA/APK (192 y 512) generados al vuelo: monograma "B" sobre
// el morado de marca. El contenido queda dentro de la zona segura "maskable".
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const px = size === '512' ? 512 : 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#4d4260',
          color: '#ffffff',
          fontSize: px * 0.55,
          fontWeight: 700,
        }}
      >
        B
      </div>
    ),
    { width: px, height: px }
  );
}
