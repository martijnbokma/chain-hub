import type { ReactNode } from 'react';

type IconProps = { size?: number; className?: string };

/** Shared 24x24 frame: line work in currentColor, signal dots in --primary. */
function AssetIcon({ size = 24, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SkillsIcon(props: IconProps) {
  return (
    <AssetIcon {...props}>
      <path d="M13 3 5 13.5h6L10 21l8-11h-6l1-7z" />
      <circle cx="18.5" cy="4.5" r="1.8" fill="var(--primary)" stroke="none" />
    </AssetIcon>
  );
}

export function AgentsIcon(props: IconProps) {
  return (
    <AssetIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
      <circle cx="12" cy="8" r="1.4" fill="var(--primary)" stroke="none" />
    </AssetIcon>
  );
}

export function WorkflowsIcon(props: IconProps) {
  return (
    <AssetIcon {...props}>
      <path d="M6.5 6H14a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8" />
      <circle cx="4.5" cy="6" r="2" />
      <circle cx="17.5" cy="22" r="2" fill="var(--primary)" stroke="none" />
    </AssetIcon>
  );
}

export function RulesIcon(props: IconProps) {
  return (
    <AssetIcon {...props}>
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z" />
      <path d="m8.8 12 2.3 2.3 4.2-4.6" stroke="var(--primary)" />
    </AssetIcon>
  );
}

export function PromptsIcon(props: IconProps) {
  return (
    <AssetIcon {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="m7 10 3 2.5L7 15M12.5 15H17" />
      <circle cx="17" cy="15" r="1.3" fill="var(--primary)" stroke="none" />
    </AssetIcon>
  );
}

/** Editor connections: a scaled-down hub mark — open arc, spoke, center and signal dots. */
export function EditorsIcon(props: IconProps) {
  return (
    <AssetIcon {...props}>
      <path d="M17.3 6.7A7.5 7.5 0 1 0 17.3 17.3" />
      <path d="M12 12h7" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="12" r="2" fill="var(--primary)" stroke="none" />
    </AssetIcon>
  );
}
