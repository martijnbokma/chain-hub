import React, { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';

const ShellToolbarSlotContext = createContext<HTMLElement | null>(null);
const ShellToolbarSetContext = createContext<((element: HTMLElement | null) => void) | null>(null);

export function ShellToolbarProvider({ children }: { children: React.ReactNode }) {
  const [slotElement, setSlotElement] = useState<HTMLElement | null>(null);

  return (
    <ShellToolbarSetContext.Provider value={setSlotElement}>
      <ShellToolbarSlotContext.Provider value={slotElement}>{children}</ShellToolbarSlotContext.Provider>
    </ShellToolbarSetContext.Provider>
  );
}

interface ShellToolbarHostProps {
  className?: string;
}

/** Mount point in the shell header. Pages portal into this via `ShellToolbar`. */
export function ShellToolbarHost({ className }: ShellToolbarHostProps) {
  const setSlotElement = useContext(ShellToolbarSetContext);

  return <div className={className} ref={setSlotElement ?? undefined} />;
}

interface ShellToolbarProps {
  children: React.ReactNode;
}

/** Portal page tools into the shell header slot. Renders nothing in-place. */
export function ShellToolbar({ children }: ShellToolbarProps) {
  const slotElement = useContext(ShellToolbarSlotContext);

  if (!slotElement) {
    return null;
  }

  return createPortal(children, slotElement);
}
