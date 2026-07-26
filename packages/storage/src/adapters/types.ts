import type { AssetDetail, AssetKind, Integration } from "@chain-hub/contracts";

export interface EditorAdapter {
  id: string;
  label: string;
  /** Asset kinds this editor gets synced natively. */
  supportedKinds: AssetKind[];
  /** Kinds that must be rebuilt in full on every change (e.g. a single merged rules file) rather than written 1:1. */
  mergeKinds: AssetKind[];
  status(homeDir: string): Promise<Integration>;
  writeAsset(chainHome: string, homeDir: string, asset: AssetDetail): Promise<void>;
  removeAsset(chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void>;
  /** Full rebuild from the current asset list — used by `chain setup` and for mergeKinds. */
  resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void>;
}
