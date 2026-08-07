import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useTheme } from '../../hooks/use-theme';
import { integrationsApi } from '../../lib/api';

export interface CommandAction {
  id: string;
  label: string;
  description: string;
  keywords: string;
  run: () => void;
}

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
  const connectedCount = integrations.data?.filter((integration) => integration.connected).length ?? 0;

  const connectEditors = useMutation({
    mutationFn: async () => {
      const response = await integrationsApi.setup();
      if (!response.ok) {
        throw new Error('Unable to connect editors');
      }
      return response.json();
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
        run: () => navigate('/')
      },
      {
        id: 'go-library',
        label: 'Open library',
        description: 'Browse indexed assets and edit content.',
        keywords: 'library assets editor skills rules workflows agents',
        run: () => navigate('/library')
      },
      {
        id: 'create-asset',
        label: 'Create asset',
        description: 'Jump to the library and open the create flow.',
        keywords: 'new asset create library',
        run: () => navigate('/library?create=1')
      },
      {
        id: 'go-integrations',
        label: 'Open integrations',
        description: 'Inspect editor mounts and adapter state.',
        keywords: 'integrations editors mounts adapters',
        run: () => navigate('/integrations')
      },
      {
        id: 'go-settings',
        label: 'Open settings',
        description: 'Configure appearance and AI providers.',
        keywords: 'settings ai anthropic openai mistral ollama api key theme appearance',
        run: () => navigate('/settings')
      },
      {
        id: 'go-setup',
        label: 'Open setup',
        description: 'Review the guided setup checklist.',
        keywords: 'setup guided checklist onboarding',
        run: () => navigate('/setup')
      },
      {
        id: 'theme-light',
        label: 'Use light theme',
        description: 'Switch to Cool Trust light.',
        keywords: 'theme light appearance day',
        run: () => setPreference('light')
      },
      {
        id: 'theme-dark',
        label: 'Use dark theme',
        description: 'Switch to Cool Trust Dark.',
        keywords: 'theme dark appearance night',
        run: () => setPreference('dark')
      },
      {
        id: 'theme-system',
        label: 'Use system theme',
        description: 'Follow the OS light/dark preference.',
        keywords: 'theme system appearance auto',
        run: () => setPreference('system')
      },
      {
        id: 'connect-editors',
        label: 'Connect editors',
        description: 'Run the integration setup flow from the command palette.',
        keywords: 'connect editors integrations setup',
        run: () => connectEditors.mutate()
      }
    ],
    [connectEditors, navigate, setPreference]
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
    integrations,
    connectedCount,
    connectEditors
  };
}
