import type { CaptureEventType, SkillReflection } from '@/types';

// Event type badge configurations
export const EVENT_TYPE_BADGE: Record<CaptureEventType, { label: string; variant: "success" | "warning" | "destructive" | "accent" }> = {
  success: { label: "success", variant: "success" },
  note: { label: "note", variant: "accent" },
  correction: { label: "correction", variant: "warning" },
  failure: { label: "failure", variant: "destructive" }
};

// Trend configurations for skill reflections
export const TREND_CONFIG: Record<SkillReflection["trend"], { icon: string; variant: "success" | "warning" | "destructive" | "accent" | "default" }> = {
  improving: { icon: "↑", variant: "success" },
  stable: { icon: "→", variant: "default" },
  struggling: { icon: "↓", variant: "destructive" },
  new: { icon: "★", variant: "accent" }
};

// Asset kinds for filtering
export const ASSET_KINDS = ["skills", "agents", "workflows", "rules"] as const;

// Navigation links for the sidebar
export const SIDEBAR_LINKS = [
  { to: "/setup", label: "Setup", iconName: "Sparkles" },
  { to: "/", label: "Overview", iconName: "PanelLeft" },
  { to: "/library", label: "Library", iconName: "FolderTree" },
  { to: "/memory", label: "Memory", iconName: "BookMarked" },
  { to: "/learnings", label: "Learnings", iconName: "Zap" },
  { to: "/integrations", label: "Integrations", iconName: "Link2" }
] as const;