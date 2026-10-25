import * as React from "react";

import { cn } from "../../lib/utils";

type TabsContextValue = {
  value: string | undefined;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);

  if (!context) {
    throw new Error("Tabs components must be used inside Tabs");
  }

  return context;
}

export function Tabs({
  children,
  defaultValue,
  value,
  onValueChange,
  className
}: {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}) {
  const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue);
  const currentValue = value ?? internalValue;

  return (
    <TabsContext.Provider
      value={{
        value: currentValue,
        setValue: (nextValue) => {
          if (value === undefined) {
            setInternalValue(nextValue);
          }
          onValueChange?.(nextValue);
        }
      }}
    >
      <div className={cn("grid gap-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

const TAB_NAVIGATION_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

/** WAI-ARIA tabs keyboard pattern: arrows/Home/End move focus and activate the target tab. */
function handleTabListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  if (!TAB_NAVIGATION_KEYS.has(event.key)) {
    return;
  }
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
  const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
  if (tabs.length === 0 || currentIndex === -1) {
    return;
  }
  event.preventDefault();
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  tabs[nextIndex]?.focus();
  tabs[nextIndex]?.click();
}

export function TabsList({ className, onKeyDown, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      onKeyDown={(event) => {
        handleTabListKeyDown(event);
        onKeyDown?.(event);
      }}
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-xl border border-border/70 bg-muted/70 p-1 text-muted-foreground",
        className
      )}
      data-slot="tabs-list"
      role="tablist"
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  children
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = useTabsContext();
  const active = context.value === value;

  return (
    <button
      aria-selected={active}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        active
          ? "bg-background text-foreground font-semibold shadow-xs border border-border/70 dark:bg-card dark:border-border/80"
          : "text-muted-foreground hover:text-foreground border border-transparent hover:bg-background/40",
        className
      )}
      data-active={active ? "" : undefined}
      data-slot="tabs-trigger"
      onClick={() => context.setValue(value)}
      role="tab"
      tabIndex={active ? 0 : -1}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = useTabsContext();

  if (context.value !== value) {
    return null;
  }

  return <div className={cn("grid gap-4", className)}>{children}</div>;
}
