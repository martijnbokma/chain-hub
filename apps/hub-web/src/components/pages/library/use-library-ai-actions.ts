import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ensureExplicitDescription } from '@chain-hub/contracts';
import { aiSettingsApi, libraryApi } from '@/lib/api';
import type { AssetKind, AuditAssetResult, ClassifyAssetResult } from '@/types';

import type { PendingAiEdit } from './AiEditPreviewDialog';

type SelectedAsset = { kind: AssetKind; name: string };

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

  // Results belong to one asset; drop them when the selection changes.
  useEffect(() => {
    setKindAssessment(null);
    setAssetAudit(null);
  }, [selected?.kind, selected?.name]);

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
      const forked = await libraryApi.forkSkill({ name: selected.name });

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

      return { forked, content };
    },
    onSuccess: ({ forked, content }) => {
      queryClient.setQueryData(['library', 'detail', forked.kind, forked.name], { ...forked, content });
      setSelected({ kind: forked.kind, name: forked.name });
      void queryClient.invalidateQueries({ queryKey: ['library'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success(`Forked to skills/${forked.name} — description drafted, review and save`);
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
    approveAiEdit,
    discardAiEdit,
    reassessKind,
    auditAsset,
    improveAsset,
    fixDescriptionWithAi,
    forkAndFixDescription
  };
}
