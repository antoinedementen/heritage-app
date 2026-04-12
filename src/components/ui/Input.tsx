import { type LucideIcon } from "lucide-react";
import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  rows?: number;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon: Icon, id, className = "", ...props }, ref) => {
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
        <div className="relative">
          {Icon && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-heritage-brown">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`h-10 w-full rounded-lg border bg-heritage-white text-sm text-heritage-dark placeholder:text-heritage-brown/50
              border-heritage-sand
              focus:outline-none focus:ring-2 focus:ring-heritage-forest focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${Icon ? "pl-9 pr-3" : "px-3"}
              ${error ? "border-heritage-red focus:ring-heritage-red" : ""}
              ${className}`}
            {...props}
          />
        </div>
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

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, id, rows = 4, className = "", ...props }, ref) => {
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
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={`w-full rounded-lg border bg-heritage-white px-3 py-2.5 text-sm text-heritage-dark placeholder:text-heritage-brown/50
            border-heritage-sand resize-y
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

Textarea.displayName = "Textarea";
