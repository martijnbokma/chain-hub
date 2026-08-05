export type AgentsSkillsDrift = {
  lockPath: string | null;
  missingNames: string[];
  missingCount: number;
};

export type Overview = {
  chainHome: string;
  initializedAt: string | null;
  assetCounts: Record<string, number>;
  health: {
    initialized: boolean;
    issues: string[];
  };
  storage: {
    databasePath: string;
    indexedAssets: number;
  };
  agentsSkillsDrift: AgentsSkillsDrift;
};
