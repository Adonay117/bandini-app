import { SelectHTMLAttributes, forwardRef, useId } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, className = '', id, children, ...props },
  ref
) {
  // Igual que en Input: sin id autogenerado el <label htmlFor> no apunta a
  // nada cuando el caller no pasa uno propio.
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`min-h-11 rounded-xl border border-secondary bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});
