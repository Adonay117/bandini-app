import { ImagenMiniatura } from '@/components/ui/ImagenMiniatura';
import { Package } from 'lucide-react';

interface Props {
  src?: string | null;
  size?: number;
  className?: string;
}

export function ProductoThumb({ src, size = 40, className = '' }: Props) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        <ImagenMiniatura src={src} size={size} />
      ) : (
        <Package size={Math.round(size * 0.38)} className="text-muted-light" />
      )}
    </div>
  );
}
