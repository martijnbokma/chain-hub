// Asset kinds for filtering
export const ASSET_KINDS = ["skills", "agents", "workflows", "rules", "prompts"] as const;

// Navigation links for the sidebar
export const SIDEBAR_LINKS = [
  { to: "/", label: "Overview", iconName: "PanelLeft" },
  { to: "/library", label: "Library", iconName: "FolderTree" },
  { to: "/integrations", label: "Integrations", iconName: "Link2" },
  { to: "/settings", label: "Settings", iconName: "Settings" }
] as const;