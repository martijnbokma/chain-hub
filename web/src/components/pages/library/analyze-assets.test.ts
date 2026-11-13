import { afterEach, describe, expect, it, vi } from 'vitest';

import { aiSettingsApi } from '@/lib/api';
import type { AssetKind, AssetRecord, ClassifyAssetResult } from '@/types';

import { analyzeLibraryAssets, type AnalysisEntry } from './analyze-assets';

function asset(kind: AssetKind, name: string): AssetRecord {
  return {
    id: `${kind}/${name}`,
    kind,
    name,
    relativePath: `${kind}/${name}.md`,
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

function classification(currentKind: AssetKind, recommendedKind: AssetKind): ClassifyAssetResult {
  return {
    currentKind,
    recommendedKind,
    matchesCurrent: currentKind === recommendedKind,
    reason: 'Because reasons'
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('analyzeLibraryAssets', () => {
  it('classifies every asset and audits only kind mismatches', async () => {
    const classify = vi
      .spyOn(aiSettingsApi, 'classifyAsset')
      .mockImplementation(async ({ kind, name }) =>
        classification(kind as AssetKind, name === 'wrong' ? 'workflows' : (kind as AssetKind))
      );
    const audit = vi
      .spyOn(aiSettingsApi, 'auditAsset')
      .mockResolvedValue({ summary: 'Fine', findings: [] });

    const entries = await analyzeLibraryAssets([
      asset('skills', 'ok-skill'),
      asset('agents', 'wrong'),
      asset('rules', 'ok-rule')
    ]);

    expect(classify).toHaveBeenCalledTimes(3);
    expect(audit).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith({ kind: 'agents', name: 'wrong' });
    expect(entries).toHaveLength(3);
    expect(entries[1].classification?.recommendedKind).toBe('workflows');
    expect(entries[1].audit?.summary).toBe('Fine');
    expect(entries[0].audit).toBeNull();
  });

  it('records classify errors and keeps going', async () => {
    vi.spyOn(aiSettingsApi, 'classifyAsset').mockImplementation(async ({ name }) => {
      if (name === 'broken') {
        throw new Error('LLM unreachable');
      }
      return classification('skills', 'skills');
    });
    const audit = vi.spyOn(aiSettingsApi, 'auditAsset');

    const entries = await analyzeLibraryAssets([asset('skills', 'broken'), asset('skills', 'fine')]);

    expect(entries[0].classifyError).toBe('LLM unreachable');
    expect(entries[1].classification?.matchesCurrent).toBe(true);
    expect(audit).not.toHaveBeenCalled();
  });

  it('records audit errors on the flagged entry', async () => {
    vi.spyOn(aiSettingsApi, 'classifyAsset').mockResolvedValue(classification('agents', 'skills'));
    vi.spyOn(aiSettingsApi, 'auditAsset').mockRejectedValue(new Error('audit exploded'));

    const entries = await analyzeLibraryAssets([asset('agents', 'maybe-skill')]);

    expect(entries[0].auditError).toBe('audit exploded');
    expect(entries[0].audit).toBeNull();
  });

  it('stops classifying when cancelled', async () => {
    vi.spyOn(aiSettingsApi, 'classifyAsset').mockResolvedValue(classification('skills', 'skills'));
    let calls = 0;
    const entries = await analyzeLibraryAssets(
      [asset('skills', 'one'), asset('skills', 'two'), asset('skills', 'three')],
      { isCancelled: () => calls++ > 0 }
    );

    expect(aiSettingsApi.classifyAsset).toHaveBeenCalledTimes(1);
    expect(entries).toHaveLength(1);
  });

  it('streams entries and progress through callbacks', async () => {
    vi.spyOn(aiSettingsApi, 'classifyAsset').mockResolvedValue(classification('skills', 'workflows'));
    vi.spyOn(aiSettingsApi, 'auditAsset').mockResolvedValue({
      summary: 'Has issues',
      findings: [{ severity: 'high', title: 'T', detail: 'D' }]
    });
    const seen: AnalysisEntry[] = [];
    const phases: string[] = [];

    await analyzeLibraryAssets([asset('skills', 'watch-me')], {
      onEntry: (entry) => seen.push(entry),
      onProgress: (progress) => phases.push(progress.phase)
    });

    expect(phases).toEqual(['classify', 'audit']);
    expect(seen).toHaveLength(2);
    expect(seen[0].audit).toBeNull();
    expect(seen[1].audit?.findings).toHaveLength(1);
  });
});
