'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/30 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-2xl border border-secondary/70 bg-white p-6 shadow-xl" role="dialog" aria-modal="true">
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-full p-1 text-muted-light hover:bg-surface hover:text-ink"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
