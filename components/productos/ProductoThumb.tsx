import Image from 'next/image';
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
        <Image src={src} alt="" width={size} height={size} className="h-full w-full object-cover" unoptimized />
      ) : (
        <Package size={Math.round(size * 0.38)} className="text-muted-light" />
      )}
    </div>
  );
}
