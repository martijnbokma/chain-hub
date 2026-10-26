import React from 'react';

/**
 * Signal-orange round dot that closes display headings. Geist's period glyph
 * is square, so the dot is drawn as a sized circle while a real "." stays
 * available to screen readers.
 */
export function SignalPeriod() {
  return (
    <>
      <span className="sr-only">.</span>
      <span
        aria-hidden="true"
        className="inline-block size-[0.18em] rounded-full bg-primary ms-[0.05em] align-baseline"
      />
    </>
  );
}
