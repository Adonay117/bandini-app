import { InputHTMLAttributes, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', id, ...props },
  ref
) {
  // Autogenerado cuando el caller no pasa id: sin esto <label htmlFor> queda
  // sin destino y el campo no tiene nombre accesible para lectores de
  // pantalla (y tocar el texto del label no enfoca el input en móvil).
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`min-h-11 rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow placeholder:text-muted-light focus:border-primary focus:ring-2 focus:ring-primary/15 ${
          error ? 'border-red-300' : 'border-secondary'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
});
