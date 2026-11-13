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
        "ca-checkbox__control group size-4.5 rounded-[5px] hover:border-foreground/30 sm:size-4",
        className
      )}
      data-slot="checkbox"
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className="ca-checkbox__indicator"
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
