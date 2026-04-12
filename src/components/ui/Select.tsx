import { ChevronDown } from "lucide-react";
import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, hint, placeholder, id, className = "", ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-heritage-dark">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`h-10 w-full appearance-none rounded-lg border bg-heritage-white
              px-3 pr-9 text-sm text-heritage-dark
              border-heritage-sand
              focus:outline-none focus:ring-2 focus:ring-heritage-forest focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? "border-heritage-red focus:ring-heritage-red" : ""}
              ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-heritage-brown" />
        </div>
        {error && <p className="text-xs text-heritage-red">{error}</p>}
        {hint && !error && <p className="text-xs text-heritage-brown">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
