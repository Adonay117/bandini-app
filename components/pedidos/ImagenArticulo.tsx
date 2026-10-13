'use client';

import { useRef, useState } from 'react';
import NextImage from 'next/image';
import { Image as ImageIcon, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { comprimirImagen } from '@/lib/utils/image';
import { pedirApi } from '@/lib/api';
import { notificar } from '@/lib/notificar';

export function ImagenArticulo({ imagenUrl, onImagenChange }: { imagenUrl: string; onImagenChange: (url: string) => void }) {
  const [subiendo, setSubiendo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    try {
      const comprimida = await comprimirImagen(file);
      const formData = new FormData();
      formData.append('file', comprimida);
      formData.append('bucket', 'pedidos');
      const { url: subida } = await notificar(
        pedirApi<{ url: string }>('/api/upload', { method: 'POST', body: formData }, 'Error al subir la imagen'),
        { cargando: 'Subiendo imagen…', exito: 'Imagen subida', error: 'No se pudo subir la imagen' }
      );
      onImagenChange(subida);
    } catch {
      // el toast ya muestra el error
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
        {subiendo ? (
          <Loader2 size={16} className="animate-spin text-muted-light" />
        ) : imagenUrl ? (
          <NextImage src={imagenUrl} alt="" width={56} height={56} className="h-full w-full object-cover" unoptimized />
        ) : (
          <ImageIcon size={18} className="text-muted-light" />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFile}
          className="hidden"
        />
        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} disabled={subiendo}>
          {imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}
        </Button>
        {imagenUrl && (
          <button
            type="button"
            onClick={() => onImagenChange('')}
            className="flex w-fit items-center gap-1 text-xs text-muted-light hover:text-negative"
          >
            <X size={11} /> Quitar imagen
          </button>
        )}
      </div>
    </div>
  );
}

export function MiniaturaArticulo({ src, size = 44 }: { src?: string | null; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface"
      style={{ width: size, height: size }}
    >
      {src ? (
        <NextImage src={src} alt="" width={size} height={size} className="h-full w-full object-cover" unoptimized />
      ) : (
        <ImageIcon size={15} className="text-muted-light" />
      )}
    </div>
  );
}
