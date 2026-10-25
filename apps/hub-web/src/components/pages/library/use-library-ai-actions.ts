import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ensureExplicitDescription, isUpstreamOwnedSkill, normalizeSkillName } from '@chain-hub/contracts';
import { aiSettingsApi, libraryApi } from '@/lib/api';
import type { AssetDetail, AssetKind, AuditAssetResult, ClassifyAssetResult } from '@/types';

import type { PendingAiEdit } from './AiEditPreviewDialog';

type SelectedAsset = { kind: AssetKind; name: string };

/**
 * Fork to `<name>-local`; when that editable copy already exists, reuse it
 * instead of dead-ending on the conflict error.
 */
async function forkOrReuseLocalCopy(target: SelectedAsset): Promise<{ forked: AssetDetail; reused: boolean }> {
  try {
    return { forked: await libraryApi.forkSkill({ kind: target.kind, name: target.name }), reused: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (!message.includes('already exists')) {
      throw error;
    }
    const localName = normalizeSkillName(`${target.name}-local`);
    if (!localName || localName === target.name) {
      throw error;
    }
    const existing = await libraryApi.getByKindAndName(target.kind, localName).catch(() => null);
    if (!existing || isUpstreamOwnedSkill(existing.provenance)) {
      throw error;
    }
    return { forked: existing, reused: true };
  }
}

/** AI actions on the selected asset: reassess kind, audit, improve and the description fixes. */
export function useLibraryAiActions(options: {
  selected: SelectedAsset | null;
  editorContent: string;
  setEditorContent: (content: string) => void;
  setSelected: (selected: SelectedAsset) => void;
}) {
  const { selected, editorContent, setEditorContent, setSelected } = options;
  const queryClient = useQueryClient();
  const [kindAssessment, setKindAssessment] = useState<ClassifyAssetResult | null>(null);
  const [assetAudit, setAssetAudit] = useState<AuditAssetResult | null>(null);
  const [pendingAiEdit, setPendingAiEdit] = useState<PendingAiEdit | null>(null);
  // Seeds from a library-wide analysis run; applied when the matching asset opens.
  const seedRef = useRef<{
    kind: AssetKind;
    name: string;
    kindAssessment: ClassifyAssetResult | null;
    assetAudit: AuditAssetResult | null;
  } | null>(null);

  // Results belong to one asset; drop them when the selection changes.
  useEffect(() => {
    const seed = seedRef.current;
    seedRef.current = null;
    const match = seed && seed.kind === selected?.kind && seed.name === selected.name ? seed : null;
    setKindAssessment(match?.kindAssessment ?? null);
    setAssetAudit(match?.assetAudit ?? null);
  }, [selected?.kind, selected?.name]);

  /**
   * Hand analysis results to the panel for an asset that is about to be
   * selected, so they render without re-running classify/audit.
   */
  function seedAiResults(entry: {
    kind: AssetKind;
    name: string;
    kindAssessment: ClassifyAssetResult | null;
    assetAudit: AuditAssetResult | null;
  }) {
    if (selected && entry.kind === selected.kind && entry.name === selected.name) {
      setKindAssessment(entry.kindAssessment);
      setAssetAudit(entry.assetAudit);
      return;
    }
    seedRef.current = entry;
  }

  function resetAiResults() {
    setKindAssessment(null);
    setAssetAudit(null);
  }

  function approveAiEdit() {
    if (!pendingAiEdit) {
      return;
    }
    setEditorContent(pendingAiEdit.after);
    setAssetAudit(null);
    setPendingAiEdit(null);
    toast.success('Applied — review and save');
  }

  function discardAiEdit() {
    setPendingAiEdit(null);
  }

  const reassessKind = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      return aiSettingsApi.classifyAsset({
        kind: selected.kind,
        name: selected.name,
        content: editorContent
      });
    },
    onSuccess: (result) => {
      setKindAssessment(result);
      toast.success(
        result.matchesCurrent
          ? `Kind looks right (${result.recommendedKind})`
          : `Suggested kind: ${result.recommendedKind}`
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to reassess kind');
    }
  });

  const auditAsset = useMutation({
    mutationFn: async (overrideContent?: string) => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      return aiSettingsApi.auditAsset({
        kind: selected.kind,
        name: selected.name,
        content: overrideContent ?? editorContent
      });
    },
    onSuccess: (result) => {
      setAssetAudit(result);
      toast.success(
        result.findings.length === 0
          ? 'Audit passed · no material findings'
          : `Audit ready · ${result.findings.length} findings`
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to audit asset');
    }
  });

  const improveAsset = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      if (!assetAudit || assetAudit.findings.length === 0) {
        throw new Error('Run an audit before applying improvements');
      }
      return aiSettingsApi.improveAsset({
        kind: selected.kind,
        name: selected.name,
        content: editorContent,
        summary: assetAudit.summary,
        findings: assetAudit.findings
      });
    },
    onSuccess: (result) => {
      setPendingAiEdit({ label: 'Apply improvements', before: editorContent, after: result.content });
      toast.success('Improvements ready — review the diff');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to improve asset');
    }
  });

  const fixDescriptionWithAi = useMutation({
    mutationFn: async () => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      return aiSettingsApi.improveAsset({
        kind: selected.kind,
        name: selected.name,
        content: editorContent,
        summary: 'Asset is missing a frontmatter description required by some editors.',
        findings: [
          {
            severity: 'high',
            title: 'Missing description',
            detail: 'Add a concise frontmatter `description` summarizing what this asset does and when to use it.'
          }
        ]
      });
    },
    onSuccess: (result) => {
      setPendingAiEdit({ label: 'AI-drafted description', before: editorContent, after: result.content });
      toast.success('Description ready — review the diff');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to generate description');
    }
  });

  const forkAndFixDescription = useMutation({
    mutationFn: async (mode: 'heading' | 'ai') => {
      if (!selected) {
        throw new Error('No asset selected');
      }
      const { forked, reused } = await forkOrReuseLocalCopy(selected);

      const content =
        mode === 'heading'
          ? ensureExplicitDescription(forked.content, forked.name)
          : await (async () => {
              const result = await aiSettingsApi.improveAsset({
                kind: forked.kind,
                name: forked.name,
                content: forked.content,
                summary: 'Asset is missing a frontmatter description required by some editors.',
                findings: [
                  {
                    severity: 'high',
                    title: 'Missing description',
                    detail:
                      'Add a concise frontmatter `description` summarizing what this asset does and when to use it.'
                  }
                ]
              });
              return result.content;
            })();

      return { forked, content, reused };
    },
    onSuccess: ({ forked, content, reused }) => {
      queryClient.setQueryData(['library', 'detail', forked.kind, forked.name], { ...forked, content });
      setSelected({ kind: forked.kind, name: forked.name });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(
        reused
          ? `Opened existing ${forked.kind}/${forked.name} · description drafted, review and save`
          : `Forked to ${forked.kind}/${forked.name} — description drafted, review and save`
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Unable to fork and fix description');
    }
  });

  return {
    kindAssessment,
    assetAudit,
    pendingAiEdit,
    resetAiResults,
    seedAiResults,
    approveAiEdit,
    discardAiEdit,
    reassessKind,
    auditAsset,
    improveAsset,
    fixDescriptionWithAi,
    forkAndFixDescription
  };
}
