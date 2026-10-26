import React from 'react';

import { SignalPeriod } from './SignalPeriod';

/**
 * Section header (the Sheet-Header Rule): a numbered mono index (`NN · kicker`)
 * directly above a sentence-case display heading ending in the signal-orange
 * period, with the section's descriptive copy alongside on wide screens.
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
        <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-foreground mb-3">
          {index} · {kicker}
        </p>
        <h2 className="font-display font-semibold text-4xl md:text-5xl leading-[1.08] tracking-[-0.03em] text-balance text-foreground">
          {title}
          <SignalPeriod />
        </h2>
      </div>
      <p className="text-lg text-foreground leading-relaxed text-pretty max-w-prose">{copy}</p>
    </div>
  );
}
