import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ensureExplicitDescription, isEditableHubAsset } from '@chain-hub/contracts';
import { aiSettingsApi, analysisApi, errorMessage, libraryApi } from '@/lib/api';
import type { AnalysisItem, AnalysisItemStatus, AssetKind, AssetRecord } from '@/types';

export type QueuedDiff = { id: string; kind: AssetKind; name: string; before: string; after: string };

export function assetKey(kind: string, name: string): string {
  return `${kind}/${name}`;
}

/**
 * Worklist behavior for the persisted analysis report: selection, per-item
 * fixes, batch "apply safe fixes" and the queued AI-improvement diffs.
 */
export function useAnalysisReview(options: { assetsByKey: Map<string, AssetRecord> }) {
  const { assetsByKey } = options;
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ current: number; total: number } | null>(null);
  const [diffQueue, setDiffQueue] = useState<QueuedDiff[]>([]);

  function invalidateAll() {
    void queryClient.invalidateQueries({ queryKey: ['library'] });
    void queryClient.invalidateQueries({ queryKey: ['library', 'detail'] });
    void queryClient.invalidateQueries({ queryKey: ['analysis'] });
    void queryClient.invalidateQueries({ queryKey: ['overview'] });
  }

  async function setItemStatus(id: string, status: AnalysisItemStatus) {
    const report = await analysisApi.setItemStatus({ id, status });
    queryClient.setQueryData(['analysis'], report);
  }

  function isEditable(item: AnalysisItem): boolean {
    const record = assetsByKey.get(assetKey(item.kind, item.name));
    return record ? isEditableHubAsset(record) : false;
  }

  /**
   * Applies the deterministic fix for one item, or queues an AI improvement
   * diff for audit findings. Returns how it was handled.
   */
  async function applyFix(item: AnalysisItem): Promise<'done' | 'queued' | 'skipped' | 'failed'> {
    if (!isEditable(item)) {
      return 'skipped';
    }
    try {
      if (item.type === 'kind-mismatch' && item.recommendedKind) {
        await libraryApi.convert(item.kind, item.name, { toKind: item.recommendedKind });
      } else if (item.type === 'compat-issue') {
        const detail = await libraryApi.getByKindAndName(item.kind, item.name);
        const next = ensureExplicitDescription(detail.content, detail.name);
        if (next === detail.content) {
          return 'skipped';
        }
        await libraryApi.update(item.kind, item.name, { content: next });
      } else if (item.type === 'audit-findings' && item.findings && item.findings.length > 0) {
        const detail = await libraryApi.getByKindAndName(item.kind, item.name);
        const result = await aiSettingsApi.improveAsset({
          kind: item.kind,
          name: item.name,
          content: detail.content,
          summary: item.summary ?? '',
          findings: item.findings
        });
        setDiffQueue((previous) => [
          ...previous,
          { id: item.id, kind: item.kind, name: item.name, before: detail.content, after: result.content }
        ]);
        return 'queued';
      } else {
        return 'skipped';
      }
      await setItemStatus(item.id, 'done');
      return 'done';
    } catch (error) {
      toast.error(errorMessage(error, `Could not fix ${item.name}`));
      return 'failed';
    }
  }

  async function fixItem(item: AnalysisItem) {
    setFixingId(item.id);
    const outcome = await applyFix(item);
    setFixingId(null);
    invalidateAll();
    if (outcome === 'done') {
      toast.success(`Fixed ${item.name}`);
    } else if (outcome === 'queued') {
      toast.success(`Improvement ready for ${item.name} — review the diff`);
    } else if (outcome === 'skipped') {
      toast.info(`${item.name}: fix it from the asset panel (upstream or not auto-fixable)`);
    }
  }

  async function applyItems(items: AnalysisItem[]) {
    const targets = items.filter((item) => item.status === 'open');
    let done = 0;
    let queued = 0;
    let skipped = 0;
    let failed = 0;
    setBatch({ current: 0, total: targets.length });
    for (const [index, item] of targets.entries()) {
      setBatch({ current: index + 1, total: targets.length });
      const outcome = await applyFix(item);
      if (outcome === 'done') done += 1;
      else if (outcome === 'queued') queued += 1;
      else if (outcome === 'skipped') skipped += 1;
      else failed += 1;
    }
    setBatch(null);
    setSelectedIds(new Set());
    invalidateAll();
    const parts = [
      done > 0 ? `${done} fixed` : null,
      queued > 0 ? `${queued} to review` : null,
      skipped > 0 ? `${skipped} skipped` : null,
      failed > 0 ? `${failed} failed` : null
    ].filter(Boolean);
    toast.success(parts.length > 0 ? parts.join(' · ') : 'Nothing to apply');
  }

  async function approveQueuedDiff() {
    const head = diffQueue[0];
    if (!head) {
      return;
    }
    try {
      await libraryApi.update(head.kind, head.name, { content: head.after });
      await setItemStatus(head.id, 'done');
      setDiffQueue((previous) => previous.slice(1));
      invalidateAll();
      const remaining = diffQueue.length - 1;
      toast.success(`Applied to ${head.name}${remaining > 0 ? ` — ${remaining} left to review` : ''}`);
    } catch (error) {
      toast.error(errorMessage(error, `Could not apply improvement to ${head.name}`));
    }
  }

  function discardQueuedDiff() {
    setDiffQueue((previous) => previous.slice(1));
  }

  function toggleSelect(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllOpen(items: AnalysisItem[]) {
    setSelectedIds(new Set(items.filter((item) => item.status === 'open').map((item) => item.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  return {
    selectedIds,
    fixingId,
    batch,
    diffQueue,
    fixItem,
    applyItems,
    approveQueuedDiff,
    discardQueuedDiff,
    toggleSelect,
    selectAllOpen,
    clearSelection,
    setItemStatus
  };
}
