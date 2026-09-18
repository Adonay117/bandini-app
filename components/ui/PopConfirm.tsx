'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface PopConfirmRequest {
  anchor: HTMLElement;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

interface Position {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
  arrowLeft: number;
}

const WIDTH = 224;
const GAP = 8;

// Popover de confirmación anclado al elemento que lo disparó, para
// reemplazar window.confirm() con algo que respete el estilo de la app.
// Se porta a document.body para no quedar recortado por contenedores con
// overflow (el stepper y las filas de la tabla de pedidos lo tienen).
export function PopConfirm({ request, onClose }: { request: PopConfirmRequest | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  useLayoutEffect(() => {
    if (!request) {
      setPosition(null);
      return;
    }
    const rect = request.anchor.getBoundingClientRect();
    const height = ref.current?.offsetHeight ?? 96;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement: 'top' | 'bottom' = spaceBelow < height + GAP && rect.top > height + GAP ? 'top' : 'bottom';

    let left = rect.left + rect.width / 2 - WIDTH / 2;
    left = Math.max(GAP, Math.min(left, window.innerWidth - WIDTH - GAP));
    const arrowLeft = rect.left + rect.width / 2 - left;
    const top = placement === 'bottom' ? rect.bottom + GAP : rect.top - GAP - height;

    setPosition({ top, left, placement, arrowLeft });
  }, [request]);

  useEffect(() => {
    if (!request) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target) || request!.anchor.contains(target)) return;
      onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [request, onClose]);

  if (!request || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      role="alertdialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        width: WIDTH,
        visibility: position ? 'visible' : 'hidden',
      }}
      className="z-50 rounded-xl border border-border bg-white p-3 shadow-[var(--shadow-card-hover)]"
    >
      {position && (
        <span
          aria-hidden
          className={`absolute h-2 w-2 rotate-45 border-border bg-white ${
            position.placement === 'bottom' ? '-top-1 border-l border-t' : '-bottom-1 border-b border-r'
          }`}
          style={{ left: position.arrowLeft - 4 }}
        />
      )}
      <p className="text-sm text-ink">{request.message}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
        >
          {request.cancelLabel ?? 'Cancelar'}
        </button>
        <button
          type="button"
          onClick={() => {
            request.onConfirm();
            onClose();
          }}
          className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-hover"
        >
          {request.confirmLabel ?? 'Confirmar'}
        </button>
      </div>
    </div>,
    document.body
  );
}
