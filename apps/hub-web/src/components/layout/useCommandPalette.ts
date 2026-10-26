import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useTheme } from '../../hooks/use-theme';
import { errorMessage, integrationsApi } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import {
  COMMAND_ACTION_SPECS,
  COMMAND_GROUPS,
  type CommandAction,
  type CommandActionGroup,
  type CommandActionSpec
} from './command-palette-actions';

export type { CommandAction, CommandActionGroup };

/** Command palette state and the ⌘K shortcut — split out of Shell so the shortcut and its actions are testable without the sidebar JSX. */
export function useCommandPalette() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setPreference } = useTheme();
  const [commandOpen, setCommandOpen] = useState(false);

  const integrations = useQuery({
    queryKey: queryKeys.integrations,
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.setup });
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.overview });
      toast.success('Editors connected');
      setCommandOpen(false);
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Unable to connect editors'));
    }
  });
  // `mutate` is stable across renders, unlike the mutation result object.
  const runConnectEditors = connectEditors.mutate;

  const runners = useMemo<Record<CommandActionSpec['id'], () => void>>(
    () => ({
      'go-overview': () => navigate('/'),
      'go-library': () => navigate('/library'),
      'go-catalog': () => navigate('/catalog'),
      'create-asset': () => navigate('/library?create=1'),
      'go-integrations': () => navigate('/integrations'),
      'go-settings': () => navigate('/settings'),
      'go-setup': () => navigate('/setup'),
      'theme-light': () => setPreference('light'),
      'theme-dark': () => setPreference('dark'),
      'theme-system': () => setPreference('system'),
      'connect-editors': () => runConnectEditors()
    }),
    [runConnectEditors, navigate, setPreference]
  );

  const actions: CommandAction[] = useMemo(
    () => COMMAND_ACTION_SPECS.map((spec) => ({ ...spec, run: runners[spec.id] })),
    [runners]
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
