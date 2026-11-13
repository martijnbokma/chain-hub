import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { integrationsApi } from '@/lib/api';
import { makeIntegration, renderWithProviders } from '@/test/render';

import { useCommandPalette } from './useCommandPalette';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

let palette: ReturnType<typeof useCommandPalette>;

function Harness() {
  palette = useCommandPalette();
  return <p>{palette.commandOpen ? 'open' : 'closed'}</p>;
}

beforeEach(() => {
  vi.spyOn(integrationsApi, 'getAll').mockResolvedValue([
    makeIntegration({ id: 'cursor', label: 'Cursor' }),
    makeIntegration({ id: 'claude-code', label: 'Claude Code', connected: false, mode: 'missing' }),
    makeIntegration({ id: 'zed', label: 'Zed', installed: false, connected: false, mode: 'missing' })
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCommandPalette', () => {
  it('toggles with the ⌘K / Ctrl+K shortcut', () => {
    renderWithProviders(<Harness />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByText('open')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'K', ctrlKey: true });
    expect(screen.getByText('closed')).toBeInTheDocument();
  });

  it('groups actions and counts only installed editors', async () => {
    renderWithProviders(<Harness />);

    await waitFor(() => expect(palette.installedEditors).toHaveLength(2));
    expect(palette.connectedCount).toBe(1);
    expect(palette.actionGroups.map((entry) => entry.group)).toEqual(['Navigate', 'Appearance', 'Hub']);
  });

  it('navigates from a navigation action', async () => {
    const { router } = renderWithProviders(<Harness />);

    act(() => {
      palette.actions.find((action) => action.id === 'go-settings')!.run();
    });

    await waitFor(() => expect(router.state.location.pathname).toBe('/settings'));
  });

  it('connects editors and closes the palette', async () => {
    const setup = vi.spyOn(integrationsApi, 'setup').mockResolvedValue([]);
    renderWithProviders(<Harness />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.getByText('open')).toBeInTheDocument();

    act(() => {
      palette.actions.find((action) => action.id === 'connect-editors')!.run();
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Editors connected'));
    expect(setup).toHaveBeenCalled();
    expect(await screen.findByText('closed')).toBeInTheDocument();
  });
});
