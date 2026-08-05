import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const alertVariants = cva(
  "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-5",
  {
    variants: {
      variant: {
        default: "border-border bg-muted/40 text-foreground",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-800",
        destructive: "border-red-500/20 bg-red-500/10 text-red-800"
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
