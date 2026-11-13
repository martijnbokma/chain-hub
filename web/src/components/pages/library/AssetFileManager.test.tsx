import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SkillFileEntry } from '@/types';
import { AssetFileManager } from './AssetFileManager';

describe('AssetFileManager', () => {
  const sampleFiles: SkillFileEntry[] = [
    { path: 'reference', isDirectory: true, size: 0 },
    { path: 'reference/rules/styling.md', isDirectory: false, size: 2048 },
    { path: 'reference/rules/forms.md', isDirectory: false, size: 1024 },
    { path: 'data/ux-guidelines.csv', isDirectory: false, size: 8192 },
    { path: 'package.json', isDirectory: false, size: 512 }
  ];

  it('renders asset title, badges, main file and package files', () => {
    const onSelectFile = vi.fn();
    const onBackToAssets = vi.fn();

    render(
      <AssetFileManager
        activeFile="SKILL.md"
        assetKind="skills"
        assetName="impeccable"
        files={sampleFiles}
        onBackToAssets={onBackToAssets}
        onSelectFile={onSelectFile}
      />
    );

    expect(screen.getByText('impeccable')).toBeInTheDocument();
    expect(screen.getByText('skills')).toBeInTheDocument();
    // 4 non-directory files + 1 main = 5 files
    expect(screen.getByText('5 files')).toBeInTheDocument();
    expect(screen.getByText('SKILL.md')).toBeInTheDocument();
    expect(screen.getByText('package.json')).toBeInTheDocument();
    expect(screen.getByText('reference/rules/')).toBeInTheDocument();
    expect(screen.getByText('data/')).toBeInTheDocument();
  });

  it('selects file when clicked', async () => {
    const user = userEvent.setup();
    const onSelectFile = vi.fn();
    const onBackToAssets = vi.fn();

    render(
      <AssetFileManager
        activeFile="SKILL.md"
        assetKind="skills"
        assetName="impeccable"
        files={sampleFiles}
        onBackToAssets={onBackToAssets}
        onSelectFile={onSelectFile}
      />
    );

    await user.click(screen.getByText('package.json'));
    expect(onSelectFile).toHaveBeenCalledWith('package.json');

    await user.click(screen.getByText('styling.md'));
    expect(onSelectFile).toHaveBeenCalledWith('reference/rules/styling.md');
  });

  it('filters files based on search input', async () => {
    const user = userEvent.setup();
    render(
      <AssetFileManager
        activeFile="SKILL.md"
        assetKind="skills"
        assetName="impeccable"
        files={sampleFiles}
        onBackToAssets={vi.fn()}
        onSelectFile={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Filter files…');
    await user.type(searchInput, 'guidelines');

    expect(screen.getByText('ux-guidelines.csv')).toBeInTheDocument();
    expect(screen.queryByText('package.json')).not.toBeInTheDocument();
    expect(screen.queryByText('styling.md')).not.toBeInTheDocument();
  });

  it('navigates back to assets on back button click', async () => {
    const user = userEvent.setup();
    const onBackToAssets = vi.fn();

    render(
      <AssetFileManager
        activeFile="SKILL.md"
        assetKind="skills"
        assetName="impeccable"
        files={sampleFiles}
        onBackToAssets={onBackToAssets}
        onSelectFile={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Back to assets/i }));
    expect(onBackToAssets).toHaveBeenCalledTimes(1);
  });
});
