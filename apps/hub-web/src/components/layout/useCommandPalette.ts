import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { integrationsApi, learningsApi } from '../../lib/api';
import type { CaptureEvent, CaptureEventType } from '../../types';

export interface CommandAction {
  id: string;
  label: string;
  description: string;
  keywords: string;
  run: () => void;
}

/** Command palette state, capture-event dialog state, and the ⌘K shortcut — split out of Shell so the shortcut and its actions are testable without the sidebar JSX. */
export function useCommandPalette() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commandOpen, setCommandOpen] = useState(false);

  const integrations = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.getAll()
  });
  const connectedCount = integrations.data?.filter((integration) => integration.connected).length ?? 0;

  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureType, setCaptureType] = useState<CaptureEventType>('note');
  const [captureSkill, setCaptureSkill] = useState('');
  const [captureSummary, setCaptureSummary] = useState('');

  const captureEventMutation = useMutation({
    mutationFn: async () => {
      const response = await learningsApi.captureEvent({ type: captureType, skill: captureSkill, summary: captureSummary });
      if (!response.ok) throw new Error('Capture failed');
      return response.json() as Promise<CaptureEvent>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['learnings'] });
      setCaptureOpen(false);
      setCaptureSkill('');
      setCaptureSummary('');
      setCaptureType('note');
      setCommandOpen(false);
      toast.success('Event captured');
    },
    onError: () => toast.error('Unable to capture event')
  });

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
        id: 'go-setup',
        label: 'Open setup',
        description: 'Review the guided setup checklist.',
        keywords: 'setup guided checklist onboarding',
        run: () => navigate('/setup')
      },
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
        id: 'go-memory',
        label: 'Open memory',
        description: 'Inspect the memory folder and recent note files.',
        keywords: 'memory notes files summary',
        run: () => navigate('/memory')
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
        id: 'go-learnings',
        label: 'Open learnings',
        description: 'Review the captured event timeline.',
        keywords: 'learnings events capture timeline reflect',
        run: () => navigate('/learnings')
      },
      {
        id: 'capture-event',
        label: 'Capture event',
        description: 'Quickly log a success, failure, correction, or note.',
        keywords: 'capture event log note success failure correction',
        run: () => { setCaptureOpen(true); }
      },
      {
        id: 'connect-editors',
        label: 'Connect editors',
        description: 'Run the integration setup flow from the command palette.',
        keywords: 'connect editors integrations setup',
        run: () => connectEditors.mutate()
      }
    ],
    [connectEditors, navigate]
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
    captureOpen,
    setCaptureOpen,
    captureType,
    setCaptureType,
    captureSkill,
    setCaptureSkill,
    captureSummary,
    setCaptureSummary,
    captureEventMutation,
    connectEditors
  };
}
