import type { AssetKind } from "./assets";

export type DiscoveredAsset = {
  editorId: string;
  editorLabel: string;
  kind: AssetKind;
  name: string;
  preview: string;
  sourcePath: string;
};

export type ImportAssetInput = {
  editorId: string;
  kind: AssetKind;
  name: string;
};
