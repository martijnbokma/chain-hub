export type AssetKind = "skills" | "agents" | "workflows" | "rules";
export type FilterKind = AssetKind | "__all__";

export type AssetRecord = {
  id: string;
  name: string;
  kind: string;
  relativePath: string;
  updatedAt: string;
};

export type AssetDetail = AssetRecord & {
  content: string;
};