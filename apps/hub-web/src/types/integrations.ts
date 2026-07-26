import type { AssetKind } from "./assets";

export type Integration = {
  id: string;
  label: string;
  targetPaths: string[];
  connected: boolean;
  mode: "managed" | "symlink" | "missing" | "conflict";
  supportedKinds: AssetKind[];
  unsupportedKinds: AssetKind[];
};