/** Drawn brand lockup — same paths as the marketing site, inked with currentColor + --primary so it follows the theme. */
export function LogoLockup({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 356 64" role="img" aria-label="Chain Hub" className={className}>
      <path
        d="M46.14 17.86A20 20 0 1 0 46.14 46.14"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line x1="32" y1="32" x2="51" y2="32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="7" fill="currentColor" />
      <circle cx="55" cy="32" r="5" fill="var(--primary)" />
      <g transform="translate(86 2)">
        <path
          d="M37.14 15.86A20 20 0 1 0 37.14 44.14M48 10V50M48 38A12 12 0 0 1 72 38V50M106 26V50M82 38A12 12 0 1 0 106 38A12 12 0 1 0 82 38M116 26V50M126 26V50M126 38A12 12 0 0 1 150 38V50M170 10V50M196 10V50M170 30H196M206 26V38A12 12 0 0 0 230 38M230 26V50M240 10V50M240 38A12 12 0 1 1 264 38A12 12 0 1 1 240 38"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="116" cy="14" r="4" fill="var(--primary)" />
      </g>
    </svg>
  );
}
