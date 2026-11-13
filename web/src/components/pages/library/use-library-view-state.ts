import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { FilterKind, OwnershipFilter, SkillBatchItemResult } from '@/types';
import { parseKindParam, parseOwnershipParam } from './asset-helpers';

/** Local UI state for the Library orchestrator: selection, dialogs, filters and list scroll flags. */
export function useLibraryViewState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<{ kind: import('@/types').AssetKind; name: string } | null>(null);
  const [masterView, setMasterView] = useState<'assets' | 'files'>('assets');
  const [activeFile, setActiveFile] = useState<string>('SKILL.md');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [forkOpen, setForkOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<FilterKind>(() => parseKindParam(searchParams.get('kind')));
  const [ownership, setOwnership] = useState<OwnershipFilter>(() =>
    parseOwnershipParam(searchParams.get('ownership'))
  );
  const [editorContent, setEditorContent] = useState('');
  const [previewFilePath, setPreviewFilePath] = useState<string | null>(null);
  const [autoAuditAsset, setAutoAuditAsset] = useState<string | null>(null);
  const [updateResults, setUpdateResults] = useState<SkillBatchItemResult[] | null>(null);
  const [relinkTarget, setRelinkTarget] = useState<string | null>(null);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [view, setView] = useState<'assets' | 'review'>('assets');
  const [listAtTop, setListAtTop] = useState(true);
  const [listAtBottom, setListAtBottom] = useState(true);

  return {
    searchParams,
    setSearchParams,
    selected,
    setSelected,
    masterView,
    setMasterView,
    activeFile,
    setActiveFile,
    removeOpen,
    setRemoveOpen,
    discoverOpen,
    setDiscoverOpen,
    forkOpen,
    setForkOpen,
    importProgress,
    setImportProgress,
    searchQuery,
    setSearchQuery,
    filterKind,
    setFilterKind,
    ownership,
    setOwnership,
    editorContent,
    setEditorContent,
    previewFilePath,
    setPreviewFilePath,
    autoAuditAsset,
    setAutoAuditAsset,
    updateResults,
    setUpdateResults,
    relinkTarget,
    setRelinkTarget,
    analyzeOpen,
    setAnalyzeOpen,
    view,
    setView,
    listAtTop,
    setListAtTop,
    listAtBottom,
    setListAtBottom
  };
}
