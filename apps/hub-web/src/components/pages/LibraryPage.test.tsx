import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { aiSettingsApi, libraryApi, overviewApi } from '@/lib/api';
import { makeAsset, makeOverview, renderWithProviders } from '@/test/render';
import type { AssetDetail } from '@/types';

import { LibraryPage } from './LibraryPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));

vi.mock('@/components/common/MarkdownSourceEditor', () => ({
  MarkdownSourceEditor: ({
    value,
    onChange,
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
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      value={value}
    />
  )
}));

const rule = makeAsset({ kind: 'rules', name: 'testing-style', content: '# Testing style\n\nUse vitest.\n' });
const skill = makeAsset({
  kind: 'skills',
  name: 'pdf-tool',
  content: '---\nname: pdf-tool\ndescription: Work with PDFs\n---\n\n# PDF\n'
});
const assets: AssetDetail[] = [rule, skill];

beforeEach(() => {
  vi.spyOn(libraryApi, 'getAll').mockResolvedValue(assets);
  vi.spyOn(overviewApi, 'get').mockResolvedValue(makeOverview());
  vi.spyOn(libraryApi, 'getByKindAndName').mockImplementation(async (kind, name) => {
    const asset = assets.find((item) => item.kind === kind && item.name === name);
    if (!asset) {
      throw new Error('Asset not found');
    }
    return asset;
  });
  vi.spyOn(libraryApi, 'getSkillFiles').mockResolvedValue({ files: [] });
  vi.spyOn(libraryApi, 'checkSkillUpdates').mockResolvedValue({
    results: [],
    checkedAt: '2026-10-24T00:00:00.000Z'
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function openAsset(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(await screen.findByRole('button', { name: new RegExp(name) }));
}

describe('LibraryPage', () => {
  it('lists assets and filters them by search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LibraryPage />, { route: '/library' });

    expect(await screen.findByRole('button', { name: /testing-style/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf-tool/ })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Search assets' }), 'pdf');

    await waitFor(() => expect(screen.queryByRole('button', { name: /testing-style/ })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /pdf-tool/ })).toBeInTheDocument();
  });

  it('saves edits to the selected asset', async () => {
    const user = userEvent.setup();
    const update = vi
      .spyOn(libraryApi, 'update')
      .mockImplementation(async (_kind, _name, data) => ({ ...rule, content: data.content }));
    renderWithProviders(<LibraryPage />, { route: '/library' });

    await openAsset(user, 'testing-style');
    const editor = await screen.findByRole('textbox', { name: 'Edit rules testing-style' });
    await user.type(editor, 'Prefer small tests.');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('rules', 'testing-style', {
        content: '# Testing style\n\nUse vitest.\nPrefer small tests.'
      })
    );
    expect(toast.success).toHaveBeenCalledWith('Saved rules/testing-style');
  });

  it('shows the server error when a save is rejected', async () => {
    const user = userEvent.setup();
    vi.spyOn(libraryApi, 'update').mockRejectedValue(new Error('Skill description is missing.'));
    renderWithProviders(<LibraryPage />, { route: '/library' });

    await openAsset(user, 'testing-style');
    await user.type(await screen.findByRole('textbox', { name: 'Edit rules testing-style' }), '!');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Skill description is missing.'));
  });

  it('deletes an asset after confirmation', async () => {
    const user = userEvent.setup();
    const remove = vi.spyOn(libraryApi, 'delete').mockResolvedValue({ ok: true });
    renderWithProviders(<LibraryPage />, { route: '/library' });

    await openAsset(user, 'testing-style');
    await user.click(await screen.findByRole('button', { name: 'Delete asset' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith('rules', 'testing-style'));
  });

  it('asks before discarding unsaved edits when another asset is picked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LibraryPage />, { route: '/library' });

    await openAsset(user, 'testing-style');
    await user.type(await screen.findByRole('textbox', { name: 'Edit rules testing-style' }), ' draft');
    await openAsset(user, 'pdf-tool');

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Discard unsaved changes?' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Discard changes' }));

    expect(await screen.findByRole('textbox', { name: 'Edit skills pdf-tool' })).toBeInTheDocument();
  });

  it('automatically runs audit and opens dialog when navigating with ?audit=1', async () => {
    const auditSpy = vi.spyOn(aiSettingsApi, 'auditAsset').mockResolvedValue({
      summary: 'One field-reported gap.',
      findings: [
        { severity: 'medium', title: 'PDF parsing gotcha', detail: 'Check buffer size.', source: 'learning' }
      ],
      learningsConsidered: 2
    });

    renderWithProviders(<LibraryPage />, { route: '/library?kind=skills&asset=pdf-tool&audit=1' });

    await waitFor(() =>
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'skills',
          name: 'pdf-tool'
        })
      )
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Audit findings' })).toBeInTheDocument();
    expect(within(dialog).getByText('PDF parsing gotcha')).toBeInTheDocument();
  });

  it('enforces upstream protection: read-only editor, no direct save, fork to customize', async () => {
    const upstreamSkill = makeAsset({
      kind: 'skills',
      name: 'community-skill',
      content: '---\nname: community-skill\ndescription: A community skill\n---\n\n# Body\n',
      provenance: {
        source: 'https://github.com/example/skills',
        sourceType: 'git',
        updatedAt: '2026-09-01T00:00:00.000Z'
      }
    });

    vi.spyOn(libraryApi, 'getAll').mockResolvedValue([...assets, upstreamSkill]);
    vi.spyOn(libraryApi, 'getByKindAndName').mockImplementation(async (kind, name) => {
      if (kind === 'skills' && name === 'community-skill') {
        return upstreamSkill;
      }
      const asset = assets.find((item) => item.kind === kind && item.name === name);
      if (!asset) throw new Error('Asset not found');
      return asset;
    });

    renderWithProviders(<LibraryPage />, { route: '/library?kind=skills&asset=community-skill' });

    // Verify upstream status text and badge
    expect(await screen.findByText('Viewing upstream skills')).toBeInTheDocument();
    // Card and detail panel both mark the asset as upstream-owned
    expect(screen.getAllByText('Upstream-owned').length).toBeGreaterThanOrEqual(2);

    // Verify Save changes is NOT present, and Fork to customize IS present
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fork to customize' })).toBeInTheDocument();

    // Verify Rename button is NOT present
    expect(screen.queryByRole('button', { name: 'Rename asset' })).not.toBeInTheDocument();

    // Verify editor is read-only
    const editor = screen.getByRole('textbox', { name: 'View skills community-skill' });
    expect(editor).toHaveAttribute('readonly');
  });

  it('treats catalog-installed agents as upstream and forks them as agents', async () => {
    const user = userEvent.setup();
    const upstreamAgent = makeAsset({
      kind: 'agents',
      name: 'qa-agent',
      content: '---\nname: qa-agent\ndescription: QA agent\n---\n\n# QA\n',
      provenance: {
        source: 'https://github.com/example/agents',
        sourceType: 'git',
        updatedAt: '2026-09-01T00:00:00.000Z'
      }
    });
    const forkedAgent = makeAsset({ kind: 'agents', name: 'qa-agent-local', content: upstreamAgent.content });

    vi.spyOn(libraryApi, 'getAll').mockResolvedValue([...assets, upstreamAgent]);
    vi.spyOn(libraryApi, 'getByKindAndName').mockImplementation(async (kind, name) => {
      if (kind === 'agents' && name === 'qa-agent') return upstreamAgent;
      if (kind === 'agents' && name === 'qa-agent-local') return forkedAgent;
      const asset = assets.find((item) => item.kind === kind && item.name === name);
      if (!asset) throw new Error('Asset not found');
      return asset;
    });
    const forkSpy = vi.spyOn(libraryApi, 'forkSkill').mockResolvedValue(forkedAgent);

    renderWithProviders(<LibraryPage />, { route: '/library?kind=agents&asset=qa-agent' });

    expect(await screen.findByText('Viewing upstream agents')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename asset' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'View agents qa-agent' })).toHaveAttribute('readonly');

    await user.click(screen.getByRole('button', { name: 'Fork to customize' }));
    await waitFor(() => expect(forkSpy).toHaveBeenCalledWith({ kind: 'agents', name: 'qa-agent' }));
    expect(toast.success).toHaveBeenCalledWith('Forked to agents/qa-agent-local — safe to edit');
  });

  it('badges skills with an available update and counts them on the update button', async () => {
    const upstreamSkill = makeAsset({
      kind: 'skills',
      name: 'community-skill',
      content: '---\nname: community-skill\ndescription: A community skill\n---\n\n# Body\n',
      provenance: {
        source: 'https://github.com/example/skills',
        sourceType: 'git',
        subdir: null,
        commitSha: 'abc123',
        latestSha: 'def456',
        installedAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z'
      }
    });

    vi.spyOn(libraryApi, 'getAll').mockResolvedValue([...assets, upstreamSkill]);
    vi.spyOn(libraryApi, 'checkSkillUpdates').mockResolvedValue({
      results: [
        {
          name: 'community-skill',
          status: 'update_available',
          source: 'https://github.com/example/skills',
          currentSha: 'abc123',
          latestSha: 'def456'
        }
      ],
      checkedAt: '2026-10-24T00:00:00.000Z'
    });

    renderWithProviders(<LibraryPage />, { route: '/library?kind=skills' });

    expect(await screen.findByText('Update available')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Update (1)' })).toBeInTheDocument();
  });

  it('shows a per-skill summary dialog after updating skills', async () => {
    vi.spyOn(libraryApi, 'updateSkills').mockResolvedValue({
      results: [
        {
          name: 'pdf-tool',
          status: 'updated',
          previousCommitSha: 'aaaaaaa1111111',
          lockEntry: {
            sourceType: 'git',
            source: 'https://github.com/example/skills',
            subdir: null,
            contentHash: 'hash',
            commitSha: 'bbbbbbb2222222',
            installedAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-10-24T00:00:00.000Z'
          }
        },
        { name: 'other-skill', status: 'skipped' },
        { name: 'broken-skill', status: 'failed', error: 'remote gone' }
      ]
    });

    renderWithProviders(<LibraryPage />, { route: '/library?kind=skills' });
    // userEvent won't click through the base-ui TooltipTrigger render-prop in jsdom; fireEvent does.
    fireEvent.click(await screen.findByRole('button', { name: 'Update skills' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Skill update summary')).toBeInTheDocument();
    expect(within(dialog).getByText('pdf-tool')).toBeInTheDocument();
    expect(within(dialog).getByText('Updated')).toBeInTheDocument();
    expect(within(dialog).getByText('aaaaaaa → bbbbbbb')).toBeInTheDocument();
    expect(within(dialog).getByText('broken-skill')).toBeInTheDocument();
    expect(within(dialog).getByText('remote gone')).toBeInTheDocument();
    expect(within(dialog).getByText('other-skill')).toBeInTheDocument();
    expect(within(dialog).getByText('Up to date')).toBeInTheDocument();
  });

  it('protects upstream skills in audit: shows fork notice instead of apply improvements', async () => {
    const upstreamSkill = makeAsset({
      kind: 'skills',
      name: 'community-skill',
      content: '---\nname: community-skill\ndescription: A community skill\n---\n\n# Body\n',
      provenance: {
        source: 'https://github.com/example/skills',
        sourceType: 'git',
        updatedAt: '2026-09-01T00:00:00.000Z'
      }
    });

    vi.spyOn(libraryApi, 'getAll').mockResolvedValue([...assets, upstreamSkill]);
    vi.spyOn(libraryApi, 'getByKindAndName').mockResolvedValue(upstreamSkill);
    vi.spyOn(aiSettingsApi, 'auditAsset').mockResolvedValue({
      summary: 'Missing constraints.',
      findings: [{ severity: 'high', title: 'No guards', detail: 'Add boundary checks.' }]
    });

    renderWithProviders(<LibraryPage />, { route: '/library?kind=skills&asset=community-skill&audit=1' });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Audit findings' })).toBeInTheDocument();

    // In the dialog: "Apply improvements" should NOT be rendered
    expect(within(dialog).queryByRole('button', { name: 'Apply improvements' })).not.toBeInTheDocument();
    // Instead, the fork notice is displayed
    expect(
      within(dialog).getByText(/Fork this skill first if you want AI to apply improvements to a local copy/)
    ).toBeInTheDocument();
  });
});
