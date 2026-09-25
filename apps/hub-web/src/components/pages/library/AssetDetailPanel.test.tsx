import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { libraryApi } from '@/lib/api';
import { renderWithProviders } from '@/test/render';
import { AssetDetailPanel } from './AssetDetailPanel';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}));

vi.mock('@/components/common/MarkdownSourceEditor', () => ({
  MarkdownSourceEditor: ({
    value,
    readOnly,
    'aria-label': ariaLabel
  }: {
    value: string;
    onChange: (value: string) => void;
    readOnly?: boolean;
    'aria-label'?: string;
  }) => (
    <textarea
      aria-label={ariaLabel}
      data-testid="mock-editor"
      readOnly={readOnly}
      value={value}
      onChange={() => {}}
    />
  )
}));

describe('AssetDetailPanel tabs & sidecars', () => {
  const baseProps = {
    selected: { kind: 'skills' as const, name: 'impeccable' },
    author: 'pbakaus',
    provenance: {
      source: 'https://github.com/pbakaus/impeccable.git',
      sourceType: 'git' as const,
      subdir: 'plugin/skills/impeccable',
      updatedAt: '2026-09-24T15:46:10.000Z'
    },
    isUpstreamSkill: true,
    upstreamBrowseUrl: 'https://github.com/pbakaus/impeccable',
    editorContent: '---\nname: impeccable\ndescription: Design skill\n---\n# Main',
    onEditorChange: vi.fn(),
    onBack: vi.fn(),
    onSave: vi.fn(),
    isSaving: false,
    onRename: vi.fn(),
    isRenaming: false,
    onFork: vi.fn(),
    isForking: false,
    onUpdateFromSource: vi.fn(),
    isUpdating: false,
    onRequestDelete: vi.fn(),
    isDeleting: false,
    onFixDescriptionWithAi: vi.fn(),
    isFixingDescriptionWithAi: false,
    onForkAndFixHeading: vi.fn(),
    isForkingAndFixingHeading: false,
    onForkAndFixWithAi: vi.fn(),
    isForkingAndFixingWithAi: false,
    kindAssessment: null,
    onReassessKind: vi.fn(),
    isReassessing: false,
    onConvertKind: vi.fn(),
    isConverting: false,
    assetAudit: null,
    onAuditAsset: vi.fn(),
    isAuditing: false,
    onImproveAsset: vi.fn(),
    isImproving: false,
    skillFiles: [
      { path: 'reference', isDirectory: true, size: 0 },
      { path: 'reference/adapt.md', isDirectory: false, size: 1024 },
      { path: 'reference/clarify.md', isDirectory: false, size: 2048 }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders package files summary and tabs when skill has sidecar files', () => {
    renderWithProviders(<AssetDetailPanel {...baseProps} />);

    expect(screen.getByText('Package files')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SKILL\.md/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Files/i })).toBeInTheDocument();
  });

  it('does not render package files banner or tabs when skill has 0 sidecar files', () => {
    renderWithProviders(<AssetDetailPanel {...baseProps} skillFiles={[]} />);

    expect(screen.queryByText('Package files')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\+ Files/i })).not.toBeInTheDocument();
  });

  it('allows opening a sidecar file via dropdown and viewing it in read-only tab', async () => {
    const user = userEvent.setup();
    vi.spyOn(libraryApi, 'getSkillFile').mockResolvedValue({
      path: 'reference/adapt.md',
      size: 1024,
      content: '# Adapt Guide Content',
      truncated: false
    });

    renderWithProviders(<AssetDetailPanel {...baseProps} />);

    // Open files dropdown
    await user.click(screen.getByRole('button', { name: /\+ Files/i }));

    // Click on reference/adapt.md
    expect(screen.getByText('reference/adapt.md')).toBeInTheDocument();
    await user.click(screen.getByText('reference/adapt.md'));

    // Should now fetch and display the sidecar file
    await waitFor(() => {
      expect(libraryApi.getSkillFile).toHaveBeenCalledWith('impeccable', 'reference/adapt.md');
    });

    expect(screen.getByText('Read-only')).toBeInTheDocument();
    expect(screen.getByText('# Adapt Guide Content')).toBeInTheDocument();

    // Close the tab
    const closeBtn = screen.getByRole('button', { name: 'Close adapt.md' });
    await user.click(closeBtn);

    // Should switch back to SKILL.md
    expect(screen.queryByText('Read-only')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'View skills impeccable' })).toHaveValue(
        baseProps.editorContent
      );
    });
  });
});
