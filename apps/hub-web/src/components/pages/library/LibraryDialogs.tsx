import type { ComponentProps } from 'react';

import type { AssetKind, DiscoveredAsset, SkillBatchItemResult } from '@/types';
import type { useAnalysisReview } from './use-analysis-review';
import type { AnalysisEntry } from './analyze-assets';
import type { useLibraryAnalysis } from './use-library-analysis';
import type { useLibraryCreateFlow } from './use-library-create-flow';
import type { useLibraryInstallFlow } from './use-library-install-flow';
import { AiEditPreviewDialog } from './AiEditPreviewDialog';
import { AnalyzeReportDialog } from './AnalyzeReportDialog';
import { CreateAssetDialog } from './CreateAssetDialog';
import { DiscardChangesDialog } from './DiscardChangesDialog';
import { DiscoverDialog } from './DiscoverDialog';
import { ForkAssetDialog } from './ForkAssetDialog';
import { InstallSkillDialog } from './InstallSkillDialog';
import { RemoveAssetDialog } from './RemoveAssetDialog';
import { SkillFilePreviewDialog } from './SkillFilePreviewDialog';
import { SkillRelinkDialog } from './SkillRelinkDialog';
import { SkillUpdateResultsDialog } from './SkillUpdateResultsDialog';

interface LibraryDialogsProps {
  createFlow: ReturnType<typeof useLibraryCreateFlow>;
  installFlow: ReturnType<typeof useLibraryInstallFlow>;
  analysis: ReturnType<typeof useLibraryAnalysis>;
  review: ReturnType<typeof useAnalysisReview>;
  selected: { kind: AssetKind; name: string } | null;
  discardOpen: boolean;
  onDiscardChanges: () => void;
  onKeepEditing: () => void;
  removeOpen: boolean;
  isDeleting: boolean;
  onRemoveConfirm: () => void;
  onRemoveOpenChange: (open: boolean) => void;
  forkOpen: boolean;
  isForking: boolean;
  onForkOpenChange: (open: boolean) => void;
  onForkSubmit: (name: string) => void;
  onForkOpenExisting: (name: string) => void;
  forkTakenNames: Set<string>;
  pendingAiEdit: ComponentProps<typeof AiEditPreviewDialog>['pendingEdit'];
  onApproveAiEdit: () => void;
  onDiscardAiEdit: () => void;
  discoverOpen: boolean;
  onDiscoverOpenChange: (open: boolean) => void;
  groupedDiscovered: Record<string, DiscoveredAsset[]>;
  importProgress: { current: number; total: number } | null;
  isCandidateImporting: (candidate: DiscoveredAsset) => boolean;
  isImportingAll: boolean;
  discoverLoading: boolean;
  onImportCandidate: (candidate: DiscoveredAsset) => void;
  onImportAll: (candidates: DiscoveredAsset[]) => void;
  analyzeOpen: boolean;
  onAnalyzeOpenChange: (open: boolean) => void;
  onOpenAnalyzedAsset: (entry: AnalysisEntry) => void;
  onRunAnalysisAgain: () => void;
  totalAssets: number;
  updateResults: SkillBatchItemResult[] | null;
  onUpdateResultsOpenChange: (open: boolean) => void;
  relinkTarget: string | null;
  onRelinkOpenChange: (open: boolean) => void;
  previewFilePath: string | null;
  onPreviewOpenChange: (open: boolean) => void;
}

/** All library dialog orchestration, kept out of the page component. */
export function LibraryDialogs({
  createFlow,
  installFlow,
  analysis,
  review,
  selected,
  discardOpen,
  onDiscardChanges,
  onKeepEditing,
  removeOpen,
  isDeleting,
  onRemoveConfirm,
  onRemoveOpenChange,
  forkOpen,
  isForking,
  onForkOpenChange,
  onForkSubmit,
  onForkOpenExisting,
  forkTakenNames,
  pendingAiEdit,
  onApproveAiEdit,
  onDiscardAiEdit,
  discoverOpen,
  onDiscoverOpenChange,
  groupedDiscovered,
  importProgress,
  isCandidateImporting,
  isImportingAll,
  discoverLoading,
  onImportCandidate,
  onImportAll,
  analyzeOpen,
  onAnalyzeOpenChange,
  onOpenAnalyzedAsset,
  onRunAnalysisAgain,
  totalAssets,
  updateResults,
  onUpdateResultsOpenChange,
  relinkTarget,
  onRelinkOpenChange,
  previewFilePath,
  onPreviewOpenChange
}: LibraryDialogsProps) {
  return (
    <>
      <CreateAssetDialog
        draftContent={createFlow.draftContent}
        draftIntent={createFlow.draftIntent}
        draftKindChoice={createFlow.draftKindChoice}
        draftName={createFlow.draftName}
        draftNameLocked={createFlow.draftNameLocked}
        isDrafting={createFlow.draftPromptWithAi.isPending}
        isSubmitting={createFlow.createAsset.isPending}
        kindReason={createFlow.kindReason}
        onDraftContentChange={createFlow.setDraftContent}
        onDraftIntentChange={createFlow.setDraftIntent}
        onDraftKindChoiceChange={createFlow.handleDraftKindChoiceChange}
        onDraftNameChange={createFlow.setDraftName}
        onDraftNameLockedChange={createFlow.setDraftNameLocked}
        onDraftWithAi={() => createFlow.draftPromptWithAi.mutate()}
        onOpenChange={createFlow.setCreateOpenSynced}
        onSubmit={() => createFlow.createAsset.mutate()}
        open={createFlow.createOpen}
        resolvedKind={createFlow.draftKind}
      />

      <InstallSkillDialog
        browsedFolder={installFlow.browsedFolder}
        folderInputRef={installFlow.folderInputRef}
        installForce={installFlow.installForce}
        installMode={installFlow.installMode}
        installName={installFlow.installName}
        installPath={installFlow.installPath}
        installRepo={installFlow.installRepo}
        installSubdir={installFlow.installSubdir}
        isInstalling={installFlow.installSkill.isPending}
        isMigrating={installFlow.migrateAgentsSkills.isPending}
        onBrowseFiles={installFlow.handleBrowseFiles}
        onInstallForceChange={installFlow.setInstallForce}
        onInstallModeChange={(mode) => {
          installFlow.setInstallMode(mode);
          installFlow.setBrowsedFolder(null);
        }}
        onInstallNameChange={installFlow.setInstallName}
        onInstallPathChange={(value) => {
          installFlow.setBrowsedFolder(null);
          installFlow.setInstallPath(value);
        }}
        onInstallRepoChange={installFlow.setInstallRepo}
        onInstallSubdirChange={installFlow.setInstallSubdir}
        onMigrate={() => installFlow.migrateAgentsSkills.mutate()}
        onOpenChange={installFlow.setInstallOpen}
        onSubmit={() => installFlow.installSkill.mutate()}
        open={installFlow.installOpen}
        submitDisabled={installFlow.installSubmitDisabled}
      />

      <DiscardChangesDialog
        assetLabel={selected ? `${selected.kind}/${selected.name}` : 'this asset'}
        onDiscard={onDiscardChanges}
        onKeepEditing={onKeepEditing}
        open={discardOpen}
      />

      <RemoveAssetDialog
        isDeleting={isDeleting}
        onConfirm={onRemoveConfirm}
        onOpenChange={onRemoveOpenChange}
        open={removeOpen}
        selected={selected}
      />

      <ForkAssetDialog
        isForking={isForking}
        onOpenChange={onForkOpenChange}
        onOpenExisting={onForkOpenExisting}
        onSubmit={onForkSubmit}
        open={forkOpen}
        selected={selected}
        takenNames={forkTakenNames}
      />

      <AiEditPreviewDialog
        onApprove={onApproveAiEdit}
        onDiscard={onDiscardAiEdit}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            onDiscardAiEdit();
          }
        }}
        open={pendingAiEdit !== null}
        pendingEdit={pendingAiEdit}
      />

      <DiscoverDialog
        groupedDiscovered={groupedDiscovered}
        importProgress={importProgress}
        isCandidateImporting={isCandidateImporting}
        isImportingAll={isImportingAll}
        isLoading={discoverLoading}
        onImport={onImportCandidate}
        onImportAll={onImportAll}
        onOpenChange={onDiscoverOpenChange}
        open={discoverOpen}
      />

      <AnalyzeReportDialog
        cancelled={analysis.cancelled}
        entries={analysis.entries}
        onCancel={analysis.cancel}
        onOpenAsset={onOpenAnalyzedAsset}
        onOpenChange={onAnalyzeOpenChange}
        onRunAgain={onRunAnalysisAgain}
        open={analyzeOpen}
        progress={analysis.progress}
        status={analysis.status}
        totalAssets={totalAssets}
      />

      <SkillUpdateResultsDialog
        onOpenChange={onUpdateResultsOpenChange}
        results={updateResults}
      />

      <SkillRelinkDialog
        onOpenChange={onRelinkOpenChange}
        skillName={relinkTarget}
      />

      <AiEditPreviewDialog
        onApprove={() => void review.approveQueuedDiff()}
        onDiscard={review.discardQueuedDiff}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            review.discardQueuedDiff();
          }
        }}
        open={pendingAiEdit === null && review.diffQueue.length > 0}
        pendingEdit={
          pendingAiEdit === null && review.diffQueue.length > 0
            ? {
                label: `Improve ${review.diffQueue[0].kind}/${review.diffQueue[0].name}`,
                before: review.diffQueue[0].before,
                after: review.diffQueue[0].after
              }
            : null
        }
      />

      <SkillFilePreviewDialog
        onOpenChange={onPreviewOpenChange}
        path={previewFilePath}
        skillName={selected?.kind === 'skills' ? selected.name : null}
      />
    </>
  );
}
