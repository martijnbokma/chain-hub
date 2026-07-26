import React from 'react';

interface EyebrowProps {
  children: React.ReactNode;
}

export function Eyebrow({ children }: EyebrowProps) {
  return <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{children}</p>;
}