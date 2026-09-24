import type { AssetDetail, AssetKind, Integration } from "@chain-hub/contracts";

export interface DiscoveredCandidate {
  kind: AssetKind;
  name: string;
  content: string;
  sourcePath: string;
}

export interface EditorAdapter {
  id: string;
  label: string;
  /** Asset kinds this editor gets synced natively. */
  supportedKinds: AssetKind[];
  /** Kinds that must be rebuilt in full on every change (e.g. a single merged rules file) rather than written 1:1. */
  mergeKinds: AssetKind[];
  /** Connection state; `installed` is filled in by the integrations layer. */
  status(homeDir: string): Promise<Omit<Integration, "installed">>;
  /** `options.force` skips the "don't clobber a foreign file" guard — used when Hub claims its projection slot (import, sync, setup). */
  writeAsset(chainHome: string, homeDir: string, asset: AssetDetail, options?: { force?: boolean }): Promise<void>;
  removeAsset(chainHome: string, homeDir: string, kind: AssetKind, name: string): Promise<void>;
  /** Full rebuild from the current asset list — used by `chain setup` and for mergeKinds. Claims unmarked twins at Hub projection paths. */
  resync(chainHome: string, homeDir: string, assets: AssetDetail[]): Promise<void>;
  /** Native files that exist but aren't yet Chain-Hub-managed (no ownership marker) — candidates to import. */
  discover(homeDir: string): Promise<DiscoveredCandidate[]>;
}
