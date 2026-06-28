/**
 * @file src/components/ui/input.tsx
 * @description Reusable premium Form Input component.
 * Integrates error states, label association, and ARIA labels.
 */

import React from "react";
import { cn } from "@/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-muted-foreground select-none"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            // Stripe/Linear-style input borders: flat, slight padding, visible focus transitions
            "w-full px-3.5 py-2.5 bg-background border border-border text-sm rounded-md transition-all duration-200 outline-none",
            "placeholder:text-muted-foreground/60 text-foreground",
            "focus:border-primary focus:ring-1 focus:ring-primary focus:ring-offset-0",
            {
              "border-destructive focus:border-destructive focus:ring-destructive": error,
            },
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {error && (
          <span
            id={errorId}
            className="text-xs text-destructive font-medium mt-0.5"
            role="alert"
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
