import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

export const badgeVariants = cva(
  "ca-badge transition-colors",
  {
    variants: {
      variant: {
        default: "ca-badge--neutral border-border bg-muted/60 text-foreground",
        success: "ca-badge--success border-success/20 bg-success/10 text-success-foreground",
        warning: "ca-badge--warning border-warning/20 bg-warning/10 text-warning-foreground",
        accent: "ca-badge--primary border-primary/20 bg-primary/10 text-primary-strong",
        destructive: "ca-badge--danger border-destructive/20 bg-destructive/10 text-destructive-foreground"
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
