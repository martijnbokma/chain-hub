import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const alertVariants = cva(
  "ca-alert gap-3 px-4 py-3 text-sm leading-5",
  {
    variants: {
      variant: {
        default: "ca-alert--neutral border-border bg-muted/40 text-foreground",
        warning: "ca-alert--warning border-warning/20 bg-warning/10 text-warning-foreground",
        destructive: "ca-alert--danger border-destructive/20 bg-destructive/10 text-destructive-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, role = "status", ...props }: AlertProps) {
  return <div className={cn(alertVariants({ variant }), className)} role={role} {...props} />;
}

export function AlertIcon({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden="true"
      className={cn("mt-0.5 inline-flex size-4 shrink-0 items-center justify-center [&>svg]:size-4", className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("min-w-0 flex-1", className)} {...props} />;
}
