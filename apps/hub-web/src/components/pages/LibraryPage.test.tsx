import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { libraryApi, overviewApi } from '@/lib/api';
import { makeAsset, makeOverview, renderWithProviders } from '@/test/render';
import type { AssetDetail } from '@/types';

import { LibraryPage } from './LibraryPage';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

vi.mock('@/components/common/MarkdownSourceEditor', () => ({
  MarkdownSourceEditor: ({
    value,
    onChange,
    'aria-label': ariaLabel
  }: {
    value: string;
    onChange: (value: string) => void;
    'aria-label'?: string;
  }) => <textarea aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)} value={value} />
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
});
