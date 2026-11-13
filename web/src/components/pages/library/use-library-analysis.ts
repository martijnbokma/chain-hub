import { useCallback, useRef, useState } from 'react';

import type { AssetRecord } from '@/types';

import { analyzeLibraryAssets, type AnalysisEntry, type AnalysisProgress } from './analyze-assets';

export type AnalysisStatus = 'idle' | 'running' | 'done';

/**
 * Page-level state for the library-wide analysis so a run keeps going and its
 * report stays available while the dialog is closed.
 */
export function useLibraryAnalysis() {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [cancelled, setCancelled] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const runIdRef = useRef(0);

  const run = useCallback((assets: AssetRecord[]) => {
    const runId = ++runIdRef.current;
    const isCurrent = () => runIdRef.current === runId;

    setStatus('running');
    setCancelled(false);
    setEntries([]);
    setProgress(null);

    return analyzeLibraryAssets(assets, {
      isCancelled: () => !isCurrent(),
      onProgress: (next) => {
        if (isCurrent()) {
          setProgress(next);
        }
      },
      onEntry: (entry) => {
        if (isCurrent()) {
          setEntries((previous) => {
            const key = `${entry.asset.kind}/${entry.asset.name}`;
            const index = previous.findIndex(
              (item) => `${item.asset.kind}/${item.asset.name}` === key
            );
            if (index === -1) {
              return [...previous, entry];
            }
            const next = [...previous];
            next[index] = entry;
            return next;
          });
        }
      }
    })
      .then((entries) => ({ entries, cancelled: !isCurrent() }))
      .finally(() => {
        if (isCurrent()) {
          setStatus('done');
          setProgress(null);
        }
      });
  }, []);

  const cancel = useCallback(() => {
    if (runIdRef.current === 0) {
      return;
    }
    runIdRef.current++;
    setStatus('done');
    setCancelled(true);
    setProgress(null);
  }, []);

  return { status, cancelled, progress, entries, run, cancel };
}
