import { assetKinds } from "@chain-hub/contracts";

// Asset kinds for filtering — SSOT from @chain-hub/contracts
export const ASSET_KINDS = assetKinds;

export const ASSET_KIND_LABELS = {
  skills: "Skills",
  agents: "Agents",
  workflows: "Workflows",
  rules: "Rules",
  prompts: "Prompts"
} as const satisfies Record<(typeof ASSET_KINDS)[number], string>;

// Navigation links for the sidebar
export const SIDEBAR_LINKS = [
  { to: "/", label: "Overview", iconName: "PanelLeft" },
  { to: "/library", label: "Library", iconName: "FolderTree" },
  { to: "/integrations", label: "Integrations", iconName: "Link2" },
  { to: "/settings", label: "Settings", iconName: "Settings" }
] as const;
