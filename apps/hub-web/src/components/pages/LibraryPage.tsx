import { ArrowRight, Download, FolderTree } from 'lucide-react';

import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import type { AssetKind } from '@/types';
import { AnalysisReview } from './library/AnalysisReview';
import { AssetDetailPanel } from './library/AssetDetailPanel';
import { AssetFileManager } from './library/AssetFileManager';
import { AssetList } from './library/AssetList';
import { LibraryDialogs } from './library/LibraryDialogs';
import { LibraryToolbar } from './library/LibraryToolbar';
import { useLibraryPage } from './library/use-library-page';

export function LibraryPage() {
  const {
    library,
    analysisReport,
    selectedAsset,
    skillFiles,
    discoverQuery,
    selected,
    masterView,
    setMasterView,
    activeFile,
    setActiveFile,
    requestSelection,
    pendingSelection,
    navigationBlocker,
    filterKind,
    searchQuery,
    setSearchQuery,
    ownership,
    setOwnershipSynced,
    filteredAssets,
    kindSections,
    skillUpdates,
    skillUpdateItems,
    listScrollRef,
    listAtTop,
    listAtBottom,
    view,
    setView,
    editorContent,
    setEditorContent,
    autoAuditAsset,
    kindAssessment,
    assetAudit,
    pendingAiEdit,
    approveAiEdit,
    discardAiEdit,
    reassessKind,
    auditAsset,
    improveAsset,
    fixDescriptionWithAi,
    forkAndFixDescription,
    isUpstreamSkill,
    upstreamBrowseUrl,
    saveAsset,
    renameAsset,
    removeAsset,
    updateSkills,
    retryCheck,
    unlinkSkill,
    forkSkill,
    convertKind,
    importAsset,
    importMultipleAssets,
    createFlow,
    installFlow,
    analysis,
    review,
    assetsByKey,
    removeOpen,
    setRemoveOpen,
    discoverOpen,
    setDiscoverOpen,
    forkOpen,
    setForkOpen,
    forkTakenNames,
    importProgress,
    updateResults,
    relinkTarget,
    analyzeOpen,
    setAnalyzeOpen,
    previewFilePath,
    setPreviewFilePath,
    setRelinkTarget,
    groupedDiscovered,
    isCandidateImporting,
    hasAgentsDrift,
    agentsDrift,
    handleAnalyze,
    handleRunAnalysisAgain,
    handleOpenAnalysisItem,
    handleOpenAnalyzedAsset,
    handleDiscardChanges,
    handleKeepEditing,
    handleForkOpenExisting,
    handleForkSubmit,
    handlePreviewOpenChange,
    handleRelinkOpenChange,
    handleUpdateResultsOpenChange
  } = useLibraryPage();

  const listToolbar = (
    <LibraryToolbar
      assetCount={filteredAssets.length}
      filterKind={filterKind}
      isAnalyzing={analysis.status === 'running'}
      isCompact={selected !== null}
      isUpdatingSkills={updateSkills.isPending}
      onAnalyze={handleAnalyze}
      onCreate={() => createFlow.setCreateOpenSynced(true)}
      onDiscover={() => setDiscoverOpen(true)}
      onInstall={() => installFlow.setInstallOpen(true)}
      onOwnershipChange={setOwnershipSynced}
      onSearchQueryChange={setSearchQuery}
      onUpdateSkills={() => updateSkills.mutate(undefined)}
      onUpdateSkill={(name) => updateSkills.mutate(name)}
      onViewChange={setView}
      ownership={ownership}
      reviewOpenCount={analysisReport.data?.items.filter((item) => item.status === 'open').length ?? 0}
      searchQuery={searchQuery}
      skillUpdateItems={skillUpdateItems}
      view={view}
    />
  );

  if (library.isLoading) {
    return (
      <div className="flex h-[calc(100vh-2rem)] min-w-0 flex-col -mb-4 sm:-mb-6 sm:h-[calc(100vh-3rem)]">
        {listToolbar}
        <PageSkeleton className="min-h-0 flex-1" variant="workspace" />
      </div>
    );
  }

  if (library.isError) {
    return (
      <div className="flex h-[calc(100vh-2rem)] min-w-0 flex-col -mb-4 sm:-mb-6 sm:h-[calc(100vh-3rem)]">
        {listToolbar}
        <EmptyState description="The library index is temporarily unavailable." title="Unable to load library" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] min-w-0 flex-col -mb-4 sm:-mb-6 sm:h-[calc(100vh-3rem)]">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {hasAgentsDrift && agentsDrift ? (
          <div className="min-w-0 shrink-0 pb-3">
            <Alert className="items-center" variant="warning">
              <AlertIcon>
                <Download />
              </AlertIcon>
              <AlertDescription>
                {agentsDrift.missingCount} skill{agentsDrift.missingCount === 1 ? '' : 's'} in{' '}
                <code className="font-mono text-xs text-foreground">~/.agents</code>{' '}
                {agentsDrift.missingCount === 1 ? 'is' : 'are'} not in Hub yet
                {agentsDrift.missingNames.length > 0
                  ? ` (${agentsDrift.missingNames.slice(0, 3).join(', ')}${
                      agentsDrift.missingNames.length > 3 ? ', …' : ''
                    })`
                  : ''}
                .
              </AlertDescription>
              <Button
                className="shrink-0"
                loading={installFlow.migrateAgentsSkills.isPending}
                onClick={() => installFlow.migrateAgentsSkills.mutate()}
                size="sm"
              >
                {installFlow.migrateAgentsSkills.isPending ? 'Importing…' : 'Import into Hub'}
              </Button>
            </Alert>
          </div>
        ) : null}
        <div
          className={cn(
            'grid min-h-0 min-w-0 flex-1 gap-4',
            selected ? 'xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]' : 'grid-cols-1'
          )}
        >
          <div className={cn('flex min-h-0 min-w-0 flex-col', selected && 'hidden xl:flex')}>
            {selected && masterView === 'files' ? (
              <AssetFileManager
                activeFile={activeFile}
                assetKind={selected.kind}
                assetName={selected.name}
                files={skillFiles.data?.files ?? []}
                onBackToAssets={() => setMasterView('assets')}
                onSelectFile={(filePath) => setActiveFile(filePath)}
                provenanceSource={selectedAsset.data?.provenance?.source}
              />
            ) : (
              <>
                {selected ? (
                  <div className="mb-2 flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 px-2.5 py-1.5 text-xs">
                    <span className="truncate text-muted-foreground">
                      Selected: <strong className="text-foreground">{selected.name}</strong>
                    </span>
                    <Button
                      className="group h-6 shrink-0 gap-1 px-2 text-xs font-medium"
                      onClick={() => setMasterView('files')}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <FolderTree className="size-3" />
                      Files ({skillFiles.data?.files?.filter((f) => !f.isDirectory).length ?? 0})
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </div>
                ) : null}
                {listToolbar}
                <div
                  className={cn(
                    'min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto',
                    !selected && '-mr-4 pr-4 sm:-mr-6 sm:pr-6',
                    !listAtTop && 'fade-top',
                    !listAtBottom && 'fade-bottom'
                  )}
                  ref={listScrollRef}
                >
                  {view === 'review' ? (
                    <AnalysisReview
                      assetsByKey={assetsByKey}
                      batch={review.batch}
                      fixingId={review.fixingId}
                      isAnalyzing={analysis.status === 'running'}
                      onApplySelected={() =>
                        review.applyItems(
                          (analysisReport.data?.items ?? []).filter(
                            (item) => item.status === 'open' && review.selectedIds.has(item.id)
                          )
                        )
                      }
                      onFixItem={review.fixItem}
                      onOpenItem={handleOpenAnalysisItem}
                      onRunAgain={handleAnalyze}
                      onSelectAllOpen={() => review.selectAllOpen(analysisReport.data?.items ?? [])}
                      onSetStatus={(item, status) => void review.setItemStatus(item.id, status)}
                      onToggleSelect={review.toggleSelect}
                      report={analysisReport.data ?? null}
                      selectedIds={review.selectedIds}
                    />
                  ) : (
                    <AssetList
                      filterKind={filterKind}
                      kindSections={kindSections}
                      onSelect={(asset) => requestSelection({ kind: asset.kind as AssetKind, name: asset.name })}
                      selected={selected}
                      skillUpdates={skillUpdates}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {selected ? (
            <AssetDetailPanel
              activeFile={activeFile}
              assetAudit={assetAudit}
              author={selectedAsset.data?.author}
              editorContent={editorContent}
              isAuditing={auditAsset.isPending || autoAuditAsset === selected.name}
              isConverting={convertKind.isPending}
              isDeleting={removeAsset.isPending}
              isFixingDescriptionWithAi={fixDescriptionWithAi.isPending}
              isForkingAndFixingHeading={
                forkAndFixDescription.isPending && forkAndFixDescription.variables === 'heading'
              }
              isForkingAndFixingWithAi={
                forkAndFixDescription.isPending && forkAndFixDescription.variables === 'ai'
              }
              isForking={forkSkill.isPending}
              isImproving={improveAsset.isPending}
              isReassessing={reassessKind.isPending}
              isRenaming={renameAsset.isPending}
              isRetryingCheck={retryCheck.isPending}
              isSaving={saveAsset.isPending}
              isUnlinking={unlinkSkill.isPending}
              isUpdating={updateSkills.isPending}
              isUpstreamSkill={isUpstreamSkill}
              kindAssessment={kindAssessment}
              onAuditAsset={() => auditAsset.mutate()}
              onBack={() => requestSelection(null)}
              onConvertKind={(toKind) => convertKind.mutate(toKind)}
              onEditorChange={setEditorContent}
              onFixDescriptionWithAi={() => fixDescriptionWithAi.mutate()}
              onFork={() => setForkOpen(true)}
              onForkAndFixHeading={() => forkAndFixDescription.mutate('heading')}
              onForkAndFixWithAi={() => forkAndFixDescription.mutate('ai')}
              onImproveAsset={() => improveAsset.mutate()}
              onOpenFileManager={() => setMasterView('files')}
              onPreviewFile={setPreviewFilePath}
              onReassessKind={() => reassessKind.mutate()}
              onRelink={() => setRelinkTarget(selected.name)}
              onRename={(nextName) => renameAsset.mutate(nextName)}
              onRequestDelete={() => setRemoveOpen(true)}
              onRetryCheck={() => retryCheck.mutate(selected.name)}
              onSave={() => saveAsset.mutate()}
              onSelectFile={(filePath) => setActiveFile(filePath)}
              onUnlink={() => unlinkSkill.mutate(selected.name)}
              onUpdateFromSource={() => updateSkills.mutate(selected.name)}
              provenance={selectedAsset.data?.provenance}
              selected={selected}
              skillFiles={skillFiles.data?.files ?? []}
              updateAvailable={skillUpdates.get(selected.name) ?? false}
              upstreamBrowseUrl={upstreamBrowseUrl}
            />
          ) : null}
        </div>

        <LibraryDialogs
          analysis={analysis}
          analyzeOpen={analyzeOpen}
          createFlow={createFlow}
          discoverLoading={discoverQuery.isLoading}
          discoverOpen={discoverOpen}
          discardOpen={pendingSelection !== undefined || navigationBlocker.state === 'blocked'}
          forkOpen={forkOpen}
          forkTakenNames={forkTakenNames}
          groupedDiscovered={groupedDiscovered}
          importProgress={importProgress}
          installFlow={installFlow}
          isCandidateImporting={isCandidateImporting}
          isDeleting={removeAsset.isPending}
          isForking={forkSkill.isPending}
          isImportingAll={importMultipleAssets.isPending}
          onAnalyzeOpenChange={setAnalyzeOpen}
          onApproveAiEdit={approveAiEdit}
          onDiscardAiEdit={discardAiEdit}
          onDiscardChanges={handleDiscardChanges}
          onDiscoverOpenChange={setDiscoverOpen}
          onForkOpenChange={setForkOpen}
          onForkOpenExisting={handleForkOpenExisting}
          onForkSubmit={handleForkSubmit}
          onImportAll={(candidates) => importMultipleAssets.mutate(candidates)}
          onImportCandidate={(candidate) => importAsset.mutate(candidate)}
          onKeepEditing={handleKeepEditing}
          onOpenAnalyzedAsset={handleOpenAnalyzedAsset}
          onPreviewOpenChange={handlePreviewOpenChange}
          onRelinkOpenChange={handleRelinkOpenChange}
          onRemoveConfirm={() => removeAsset.mutate()}
          onRemoveOpenChange={setRemoveOpen}
          onRunAnalysisAgain={handleRunAnalysisAgain}
          onUpdateResultsOpenChange={handleUpdateResultsOpenChange}
          pendingAiEdit={pendingAiEdit}
          previewFilePath={previewFilePath}
          relinkTarget={relinkTarget}
          removeOpen={removeOpen}
          review={review}
          selected={selected}
          totalAssets={library.data?.length ?? 0}
          updateResults={updateResults}
        />
      </section>
    </div>
  );
}
