/**
 * @file src/components/ui/button.tsx
 * @description Reusable premium Button component.
 * Integrates loading states, accessibility ARIA roles, and keyboard focus states.
 */

import React from "react";
import { cn } from "@/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, isLoading, variant = "primary", size = "md", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base styles inspired by Stripe/Linear: spacious, keyboard friendly, smooth transition
          "inline-flex items-center justify-center font-bold transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          // Focus ring color mapped to primary ring token
          "focus:ring-primary focus:ring-offset-background",
          // Variant mappings
          {
            "clay-btn clay-btn-blue": variant === "primary",
            "clay-btn clay-btn-green": variant === "secondary",
            "clay-btn clay-btn-white border-slate-200": variant === "outline",
            "text-muted-foreground hover:text-foreground hover:bg-muted": variant === "ghost",
          },
          // Size mappings
          {
            "px-4 py-1.5 text-xs": size === "sm",
            "px-6 py-2.5 text-sm": size === "md",
            "px-8 py-3.5 text-base": size === "lg",
          },
          className
        )}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            {/* Spinning inline loader */}
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
