import React from 'react';

/**
 * Sheet header: numbered mono index + sentence-case display heading ending in the
 * signal-orange period, with the section's descriptive copy alongside on wide screens.
 */
export function SectionHead({
  index,
  kicker,
  title,
  copy,
}: {
  index: string;
  kicker: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6 lg:gap-12 items-end mb-10">
      <div>
        <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          {index} · {kicker}
        </span>
        <h2 className="font-display font-semibold text-4xl md:text-5xl leading-[1.08] tracking-[-0.03em] text-balance text-foreground mt-3">
          {title}
          <span className="text-primary">.</span>
        </h2>
      </div>
      <p className="text-lg text-muted-foreground leading-relaxed text-pretty max-w-prose">{copy}</p>
    </div>
  );
}
