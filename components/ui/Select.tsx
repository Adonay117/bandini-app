import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, className = '', id, children, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-muted">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={`min-h-11 rounded-xl border border-secondary bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
});
