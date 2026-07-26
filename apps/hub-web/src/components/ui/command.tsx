import * as React from "react";
import {
  Command as CommandPrimitive,
  CommandEmpty as CommandEmptyPrimitive,
  CommandGroup as CommandGroupPrimitive,
  CommandInput as CommandInputPrimitive,
  CommandItem as CommandItemPrimitive,
  CommandList as CommandListPrimitive
} from "cmdk";
import { Search } from "lucide-react";

import { cn } from "../../lib/utils";

export function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn("flex h-full w-full flex-col overflow-hidden rounded-xl bg-transparent text-foreground", className)}
      {...props}
    />
  );
}

export function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandInputPrimitive>) {
  return (
    <div className="flex items-center rounded-xl border border-border bg-background/60 px-3" cmdk-input-wrapper="">
      <Search className="mr-2 size-4 shrink-0 text-muted-foreground" />
      <CommandInputPrimitive
        className={cn(
          "flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function CommandList({ className, ...props }: React.ComponentProps<typeof CommandListPrimitive>) {
  return <CommandListPrimitive className={cn("max-h-[360px] overflow-y-auto overflow-x-hidden", className)} {...props} />;
}

export function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandEmptyPrimitive>) {
  return <CommandEmptyPrimitive className={cn("py-6 text-center text-sm text-muted-foreground", className)} {...props} />;
}

export function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandGroupPrimitive>) {
  return <CommandGroupPrimitive className={cn("grid gap-2 p-1", className)} {...props} />;
}

export function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandItemPrimitive>) {
  return (
    <CommandItemPrimitive
      className={cn(
        "grid cursor-pointer gap-1 rounded-xl border border-border bg-background/40 px-4 py-3 text-left text-sm outline-none transition-colors data-[selected=true]:bg-secondary",
        className
      )}
      {...props}
    />
  );
}
