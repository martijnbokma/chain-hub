import React from 'react';

/**
 * Section header: sentence-case display heading ending in the signal-orange
 * period, with the section's descriptive copy alongside on wide screens.
 */
export function SectionHead({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6 lg:gap-12 items-end mb-10">
      <h2 className="font-display font-semibold text-4xl md:text-5xl leading-[1.08] tracking-[-0.03em] text-balance text-foreground">
        {title}
        <span className="text-primary">.</span>
      </h2>
      <p className="text-lg text-foreground leading-relaxed text-pretty max-w-prose">{copy}</p>
    </div>
  );
}
