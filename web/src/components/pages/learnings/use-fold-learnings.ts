import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { errorMessage, learningsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { FoldLearningsInput, FoldLearningsResult } from '@/types';

function summarize(result: FoldLearningsResult): string {
  const counts = new Map<string, number>();
  for (const item of result.results) {
    counts.set(item.outcome, (counts.get(item.outcome) ?? 0) + 1);
  }
  const parts: string[] = [];
  if (counts.get('applied')) parts.push(`${counts.get('applied')} improved`);
  if (counts.get('reviewed-clean')) parts.push(`${counts.get('reviewed-clean')} reviewed clean`);
  if (counts.get('upstream-proposal')) parts.push(`${counts.get('upstream-proposal')} proposal artifact`);
  if (counts.get('to-source')) parts.push(`${counts.get('to-source')} written to source`);
  if (counts.get('findings-only')) parts.push(`${counts.get('findings-only')} findings-only`);
  if (counts.get('orphan')) parts.push(`${counts.get('orphan')} not in hub`);
  if (counts.get('failed')) parts.push(`${counts.get('failed')} failed`);
  return parts.join(' · ');
}

/**
 * Fold open field reports into skills via the server-side audit+improve pipeline.
 * `preview` runs the same pipeline as a dry-run: findings and proposed content
 * for review, without writing anything. `apply` writes and marks addressed.
 */
export function useFoldLearnings() {
  const queryClient = useQueryClient();

  const preview = useMutation({
    mutationFn: () => learningsApi.fold({ dryRun: true }),
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to preview the fold'));
    }
  });

  const apply = useMutation({
    mutationFn: (input: FoldLearningsInput = {}) => learningsApi.fold({ ...input, dryRun: false }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.learningsReflect });
      // Folds rewrite SKILL.md files, so library lists and detail panels are stale too.
      void queryClient.invalidateQueries({ queryKey: queryKeys.library });
      if (result.results.length === 0) {
        toast.success('Nothing to fold — no open field reports');
      } else if (result.results.every((item) => item.outcome === 'failed')) {
        toast.error(result.results[0]?.error ?? 'Fold failed');
      } else {
        toast.success(`Fold done · ${summarize(result)}`);
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to fold learnings'));
    }
  });

  return { preview, apply };
}
