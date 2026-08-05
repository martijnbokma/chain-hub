import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-muted/60 text-foreground",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-700",
        accent: "border-primary/20 bg-primary/10 text-primary",
        destructive: "border-red-500/20 bg-red-500/10 text-red-600"
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
