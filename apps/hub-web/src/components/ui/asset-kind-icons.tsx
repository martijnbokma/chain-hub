import type { ComponentType, SVGProps } from 'react';

export type AssetKindIconProps = SVGProps<SVGSVGElement> & { size?: number | string };
export type AssetKindIcon = ComponentType<AssetKindIconProps>;

/**
 * Brand asset-kind icons, ported from the marketing site ("Everything your
 * editor needs"): line work in currentColor, signal dots in --primary. When
 * `size` is omitted the icon is sized by the caller's className (e.g. size-4).
 */
function AssetIcon({ size, className, children, ...rest }: AssetKindIconProps) {
  return (
    <svg
      {...(size !== undefined ? { width: size, height: size } : {})}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function SkillsKindIcon(props: AssetKindIconProps) {
  return (
    <AssetIcon {...props}>
      <path d="M13 3 5 13.5h6L10 21l8-11h-6l1-7z" />
      <circle cx="18.5" cy="4.5" r="1.8" fill="var(--primary)" stroke="none" />
    </AssetIcon>
  );
}

export function AgentsKindIcon(props: AssetKindIconProps) {
  return (
    <AssetIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
      <circle cx="12" cy="8" r="1.4" fill="var(--primary)" stroke="none" />
    </AssetIcon>
  );
}

export function WorkflowsKindIcon(props: AssetKindIconProps) {
  return (
    <AssetIcon {...props}>
      <path d="M6.5 6H14a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8" />
      <circle cx="4.5" cy="6" r="2" />
      <circle cx="17.5" cy="22" r="2" fill="var(--primary)" stroke="none" />
    </AssetIcon>
  );
}

export function RulesKindIcon(props: AssetKindIconProps) {
  return (
    <AssetIcon {...props}>
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z" />
      <path d="m8.8 12 2.3 2.3 4.2-4.6" stroke="var(--primary)" />
    </AssetIcon>
  );
}

export function PromptsKindIcon(props: AssetKindIconProps) {
  return (
    <AssetIcon {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="m7 10 3 2.5L7 15M12.5 15H17" />
      <circle cx="17" cy="15" r="1.3" fill="var(--primary)" stroke="none" />
    </AssetIcon>
  );
}
