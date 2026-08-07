import React from 'react';

interface EyebrowProps {
  children: React.ReactNode;
}

export function Eyebrow({ children }: EyebrowProps) {
  return (
    <p className="text-2xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );
}