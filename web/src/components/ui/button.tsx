import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "ca-button gap-2 text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-foreground/90",
        secondary: "ca-button--outline",
        outline: "ca-button--outline",
        ghost: "ca-button--ghost",
        destructive: "ca-button--outline border-destructive/20 bg-destructive/10 text-destructive-foreground hover:bg-destructive/15"
      },
      size: {
        default: "ca-button--md",
        sm: "ca-button--sm",
        lg: "ca-button--lg h-10",
        "icon-sm": "ca-button--icon",
        icon: "ca-button--icon"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Shows a spinner and disables the button — the standard pending state for async actions. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, disabled, children, ...props }, ref) => {
    const isIconOnly = size === "icon" || size === "icon-sm";
    return (
      <button
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading ? (
          <LoaderCircle
            aria-hidden="true"
            className={cn("animate-spin", size === "sm" || size === "icon-sm" ? "size-3.5" : "size-4")}
          />
        ) : null}
        {loading && isIconOnly ? null : children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { buttonVariants };
