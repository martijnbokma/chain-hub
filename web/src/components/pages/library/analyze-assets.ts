import { aiSettingsApi, errorMessage } from '@/lib/api';
import type { AssetRecord, AuditAssetResult, ClassifyAssetResult } from '@/types';

/** Per-asset outcome of a library-wide analysis run. */
export type AnalysisEntry = {
  asset: AssetRecord;
  classification: ClassifyAssetResult | null;
  classifyError: string | null;
  /** Audit runs only for assets whose kind check mismatches; stays null otherwise. */
  audit: AuditAssetResult | null;
  auditError: string | null;
};

export type AnalysisProgress = {
  phase: 'classify' | 'audit';
  current: number;
  total: number;
  /** Asset currently being checked, for the progress line. */
  label: string;
};

export type AnalysisCallbacks = {
  onProgress?: (progress: AnalysisProgress) => void;
  /** Fired as soon as an asset's classification (or audit) lands, for a live report. */
  onEntry?: (entry: AnalysisEntry) => void;
  isCancelled?: () => boolean;
};

/**
 * Runs the kind check over every asset, then the heavier audit only on assets
 * whose suggested kind differs. Sequential on purpose: local providers
 * (Ollama) don't parallelize and cloud providers rate-limit bursts.
 */
export async function analyzeLibraryAssets(
  assets: AssetRecord[],
  callbacks: AnalysisCallbacks = {}
): Promise<AnalysisEntry[]> {
  const { onProgress, onEntry, isCancelled } = callbacks;
  const entries = new Map<string, AnalysisEntry>();

  const publish = (entry: AnalysisEntry) => {
    entries.set(`${entry.asset.kind}/${entry.asset.name}`, { ...entry });
    onEntry?.({ ...entry });
  };

  for (let index = 0; index < assets.length; index++) {
    if (isCancelled?.()) {
      break;
    }
    const asset = assets[index];
    onProgress?.({ phase: 'classify', current: index + 1, total: assets.length, label: asset.name });

    const entry: AnalysisEntry = {
      asset,
      classification: null,
      classifyError: null,
      audit: null,
      auditError: null
    };

    try {
      entry.classification = await aiSettingsApi.classifyAsset({ kind: asset.kind, name: asset.name });
    } catch (error) {
      entry.classifyError = errorMessage(error, 'Kind check failed');
    }
    publish(entry);
  }

  const mismatches = [...entries.values()].filter(
    (entry) => entry.classification !== null && !entry.classification.matchesCurrent
  );

  for (let index = 0; index < mismatches.length; index++) {
    if (isCancelled?.()) {
      break;
    }
    const entry = mismatches[index];
    onProgress?.({
      phase: 'audit',
      current: index + 1,
      total: mismatches.length,
      label: entry.asset.name
    });

    try {
      entry.audit = await aiSettingsApi.auditAsset({ kind: entry.asset.kind, name: entry.asset.name });
    } catch (error) {
      entry.auditError = errorMessage(error, 'Audit failed');
    }
    publish(entry);
  }

  return [...entries.values()];
}
