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
      className={cn("flex w-full flex-col overflow-hidden rounded-2xl bg-transparent text-foreground", className)}
      {...props}
    />
  );
}

export function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandInputPrimitive>) {
  return (
    <div
      className="flex items-center gap-2 border-b border-border px-3 focus-within:border-ring"
      cmdk-input-wrapper=""
    >
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
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
  return (
    <CommandListPrimitive
      className={cn("max-h-[min(22rem,50vh)] overflow-y-auto overflow-x-hidden overscroll-contain p-1.5", className)}
      {...props}
    />
  );
}

export function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandEmptyPrimitive>) {
  return (
    <CommandEmptyPrimitive
      className={cn("px-3 py-8 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandGroupPrimitive>) {
  return (
    <CommandGroupPrimitive
      className={cn(
        "overflow-hidden p-1 text-foreground",
        "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5",
        "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        "[&:not(:first-child)]:mt-1",
        className
      )}
      {...props}
    />
  );
}

export function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandItemPrimitive>) {
  return (
    <CommandItemPrimitive
      className={cn(
        "group/command-item relative flex cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2 text-left text-sm outline-none transition-colors",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        "data-[selected=true]:bg-muted",
        className
      )}
      {...props}
    />
  );
}

export function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "ml-auto shrink-0 self-center font-mono text-3xs tracking-wide text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
