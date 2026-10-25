import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border border-border bg-transparent text-foreground hover:bg-muted/70",
        outline: "border border-border bg-transparent text-foreground hover:bg-muted/70",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive: "border border-destructive/20 bg-destructive/10 text-destructive-foreground hover:bg-destructive/15"
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 px-4",
        "icon-sm": "size-9 rounded-xl",
        icon: "size-9 rounded-xl"
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
