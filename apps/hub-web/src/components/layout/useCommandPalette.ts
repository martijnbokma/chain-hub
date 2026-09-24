import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FolderTree,
  LayoutDashboard,
  Link2,
  ListChecks,
  Monitor,
  Moon,
  Plus,
  Settings,
  Sun,
  type LucideIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useTheme } from '../../hooks/use-theme';
import { integrationsApi } from '../../lib/api';

export type CommandActionGroup = 'Navigate' | 'Appearance' | 'Hub';

export interface CommandAction {
  id: string;
  label: string;
  description: string;
  keywords: string;
  group: CommandActionGroup;
  icon: LucideIcon;
  run: () => void;
}

const COMMAND_GROUPS: CommandActionGroup[] = ['Navigate', 'Appearance', 'Hub'];

/** Command palette state and the ⌘K shortcut — split out of Shell so the shortcut and its actions are testable without the sidebar JSX. */
export function useCommandPalette() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPreference } = useTheme();
  const [commandOpen, setCommandOpen] = useState(false);

  const integrations = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.getAll()
  });
  // Only editors installed on this machine count, matching the Integrations page and setup.
  const installedEditors = integrations.data?.filter((integration) => integration.installed) ?? [];
  const connectedCount = installedEditors.filter((integration) => integration.connected).length;

  const connectEditors = useMutation({
    mutationFn: async () => {
      return integrationsApi.setup();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['integrations'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success('Editors connected');
      setCommandOpen(false);
    },
    onError: () => {
      toast.error('Unable to connect editors');
    }
  });

  const actions: CommandAction[] = useMemo(
    () => [
      {
        id: 'go-overview',
        label: 'Open overview',
        description: 'See health, storage, and asset counts.',
        keywords: 'overview health storage dashboard',
        group: 'Navigate',
        icon: LayoutDashboard,
        run: () => navigate('/')
      },
      {
        id: 'go-library',
        label: 'Open library',
        description: 'Browse indexed assets and edit content.',
        keywords: 'library assets editor skills rules workflows agents',
        group: 'Navigate',
        icon: FolderTree,
        run: () => navigate('/library')
      },
      {
        id: 'create-asset',
        label: 'Create asset',
        description: 'Jump to the library and open the create flow.',
        keywords: 'new asset create library',
        group: 'Navigate',
        icon: Plus,
        run: () => navigate('/library?create=1')
      },
      {
        id: 'go-integrations',
        label: 'Open integrations',
        description: 'Inspect editor mounts and adapter state.',
        keywords: 'integrations editors mounts adapters',
        group: 'Navigate',
        icon: Link2,
        run: () => navigate('/integrations')
      },
      {
        id: 'go-settings',
        label: 'Open settings',
        description: 'Configure appearance and AI providers.',
        keywords: 'settings ai anthropic openai mistral ollama api key theme appearance',
        group: 'Navigate',
        icon: Settings,
        run: () => navigate('/settings')
      },
      {
        id: 'go-setup',
        label: 'Open setup',
        description: 'Review the guided setup checklist.',
        keywords: 'setup guided checklist onboarding',
        group: 'Navigate',
        icon: ListChecks,
        run: () => navigate('/setup')
      },
      {
        id: 'theme-light',
        label: 'Use light theme',
        description: 'Switch to Cool Trust light.',
        keywords: 'theme light appearance day',
        group: 'Appearance',
        icon: Sun,
        run: () => setPreference('light')
      },
      {
        id: 'theme-dark',
        label: 'Use dark theme',
        description: 'Switch to Cool Trust dark.',
        keywords: 'theme dark appearance night',
        group: 'Appearance',
        icon: Moon,
        run: () => setPreference('dark')
      },
      {
        id: 'theme-system',
        label: 'Use system theme',
        description: 'Follow the OS light/dark preference.',
        keywords: 'theme system appearance auto',
        group: 'Appearance',
        icon: Monitor,
        run: () => setPreference('system')
      },
      {
        id: 'connect-editors',
        label: 'Connect editors',
        description: 'Run the integration setup flow.',
        keywords: 'connect editors integrations setup',
        group: 'Hub',
        icon: Link2,
        run: () => connectEditors.mutate()
      }
    ],
    [connectEditors, navigate, setPreference]
  );

  const actionGroups = useMemo(
    () =>
      COMMAND_GROUPS.map((group) => ({
        group,
        actions: actions.filter((action) => action.group === group)
      })).filter((entry) => entry.actions.length > 0),
    [actions]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return {
    commandOpen,
    setCommandOpen,
    actions,
    actionGroups,
    integrations,
    installedEditors,
    connectedCount,
    connectEditors
  };
}
