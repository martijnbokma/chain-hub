import React from 'react';

interface ChainHubLogoProps {
  className?: string;
  showText?: boolean;
  size?: number | string;
}

/**
 * Chain Hub Official Brand Logo
 * 
 * Design: Two parallel unlinked 45° stadium capsules ascending from bottom-right to top-left,
 * rendered in solid amber (#f97316) with ambient diffusion glow.
 */
export function ChainHubLogo({
  className = "h-8 w-auto",
  showText = true,
  size
}: ChainHubLogoProps) {
  if (!showText) {
    return (
      <svg
        viewBox="0 0 60 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={size ? { width: size, height: size } : undefined}
      >
        <defs>
          <filter id="ch-icon-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#f97316" floodOpacity="0.4" />
          </filter>
        </defs>

        <g filter="url(#ch-icon-glow)">
          {/* Lower Right Stadium Link */}
          <g transform="translate(38, 38) rotate(45)">
            <rect
              x="-6"
              y="-16"
              width="12"
              height="32"
              rx="6"
              fill="none"
              stroke="#f97316"
              strokeWidth="4.5"
            />
          </g>
          {/* Upper Left Stadium Link */}
          <g transform="translate(22, 22) rotate(45)">
            <rect
              x="-6"
              y="-16"
              width="12"
              height="32"
              rx="6"
              fill="none"
              stroke="#f97316"
              strokeWidth="4.5"
            />
          </g>
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 220 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { height: size, width: 'auto' } : undefined}
    >
      <defs>
        <filter id="ch-logo-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#f97316" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Emblem: Two parallel unlinked 45° stadium capsules */}
      <g transform="translate(0, -5)" filter="url(#ch-logo-glow)">
        <g transform="translate(32, 38) rotate(45)">
          <rect
            x="-5.5"
            y="-14"
            width="11"
            height="28"
            rx="5.5"
            fill="none"
            stroke="#f97316"
            strokeWidth="4"
          />
        </g>
        <g transform="translate(18, 24) rotate(45)">
          <rect
            x="-5.5"
            y="-14"
            width="11"
            height="28"
            rx="5.5"
            fill="none"
            stroke="#f97316"
            strokeWidth="4"
          />
        </g>
      </g>

      {/* Wordmark */}
      <text
        x="54"
        y="32"
        fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="21"
        fontWeight="600"
        fill="#ffffff"
        letterSpacing="-0.025em"
      >
        Chain Hub
      </text>
    </svg>
  );
}
