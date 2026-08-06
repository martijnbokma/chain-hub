import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-muted/60 text-foreground",
        success: "border-success/20 bg-success/10 text-success-foreground",
        warning: "border-warning/20 bg-warning/10 text-warning-foreground",
        accent: "border-primary/20 bg-primary/10 text-primary",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
