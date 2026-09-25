"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "../../lib/utils";

export interface CheckboxProps
  extends Omit<CheckboxPrimitive.Root.Props, "children"> {
  className?: string;
}

export function Checkbox({
  className,
  ...props
}: CheckboxProps): React.ReactElement {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "group relative inline-flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border border-input bg-background shadow-xs outline-none transition-[color,box-shadow,border-color,background-color] hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground sm:size-4",
        className
      )}
      data-slot="checkbox"
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="flex items-center justify-center text-current data-unchecked:hidden"
        data-slot="checkbox-indicator"
        render={(
          indicatorProps: React.ComponentProps<"span">,
          state: CheckboxPrimitive.Indicator.State
        ) => (
          <span {...indicatorProps}>
            {state.indeterminate ? (
              <Minus className="size-3 stroke-[3]" />
            ) : (
              <Check className="size-3 stroke-[3]" />
            )}
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

export { CheckboxPrimitive };
