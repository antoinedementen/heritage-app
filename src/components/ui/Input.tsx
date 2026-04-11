import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = "", ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-heritage-dark"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-10 w-full rounded-lg border bg-heritage-white px-3 text-sm text-heritage-dark placeholder:text-heritage-brown/50
            border-heritage-sand
            focus:outline-none focus:ring-2 focus:ring-heritage-forest focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-heritage-red focus:ring-heritage-red" : ""}
            ${className}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-heritage-red">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-heritage-brown">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
