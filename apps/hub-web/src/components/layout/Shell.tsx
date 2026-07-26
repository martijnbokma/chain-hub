import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Command as CommandIcon, Link2, Sparkles, PanelLeft, FolderTree, BookMarked, Zap } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarHeader, 
  SidebarInset, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider, 
  SidebarTrigger 
} from '../ui/sidebar';
import { Textarea } from '../ui/textarea';
import { cn } from '../../lib/utils';
import { getJson, integrationsApi, learningsApi } from '../../lib/api';
import { Eyebrow } from '../common/Eyebrow';
import type { Integration, CaptureEventType, CaptureEvent } from '../../types';

interface ShellProps {
  children: React.ReactNode;
}

interface ActionItem {
  id: string;
  label: string;
  description: string;
  keywords: string;
  run: () => void;
}

export function Shell({ children }: ShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [commandOpen, setCommandOpen] = useState(false);

  const integrations = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.getAll()
  });
  const connectedCount = integrations.data?.filter((integration) => integration.connected).length ?? 0;

  const links = [
    { to: '/setup', label: 'Setup', icon: Sparkles },
    { to: '/', label: 'Overview', icon: PanelLeft },
    { to: '/library', label: 'Library', icon: FolderTree },
    { to: '/memory', label: 'Memory', icon: BookMarked },
    { to: '/learnings', label: 'Learnings', icon: Zap },
    { to: '/integrations', label: 'Integrations', icon: Link2 }
  ];

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
    onError: () => toast.error('Capture failed')
  });

  const connectEditors = useMutation({
    mutationFn: async () => {
      return await integrationsApi.setup();
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

  const actions = useMemo(
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

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<NavLink to="/" />} size="lg">
                  <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-semibold text-primary">
                    CH
                  </span>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      Chain Hub v2
                    </span>
                    <span className="truncate text-xs font-semibold">Local control plane</span>
                  </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {links.map((link) => {
                  const isActive = link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to);

                  return (
                    <SidebarMenuItem key={link.to}>
                      <SidebarMenuButton className="h-11 md:h-8" isActive={isActive} render={<NavLink to={link.to} />} tooltip={link.label}>
                          <link.icon />
                          <span>{link.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-3">
          <Button className="w-full justify-between" onClick={() => setCommandOpen(true)} variant="secondary">
            <span className="inline-flex items-center gap-2">
              <CommandIcon className="size-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Command menu</span>
            </span>
            <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Cmd/Ctrl + K</span>
          </Button>

          <div className="grid gap-2 rounded-lg border border-border bg-card px-3 py-3 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>Linked editors</Eyebrow>
              <span className="font-display text-[11px] text-muted-foreground">
                {connectedCount}/{integrations.data?.length ?? 0}
              </span>
            </div>
            <div className="grid gap-1.5">
              {(integrations.data ?? []).map((integration) => (
                <div className="flex items-center gap-2" key={integration.id}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      integration.connected ? 'bg-primary' : 'bg-muted-foreground/25'
                    )}
                  />
                  <span
                    className={cn(
                      'truncate text-xs',
                      integration.connected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {integration.label}
                  </span>
                </div>
              ))}
              {integrations.data?.length === 0 && (
                <p className="text-xs text-muted-foreground">No editors linked yet.</p>
              )}
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
          <SidebarTrigger className="size-11 md:size-7" />
        </header>
        <main className="px-4 py-4 sm:px-6 sm:py-6">{children}</main>
      </SidebarInset>

      <Dialog
        onOpenChange={(open) => {
          setCommandOpen(open);
        }}
        open={commandOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Command palette</DialogTitle>
            <DialogDescription>Jump through the hub and trigger common actions without hunting through screens.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Command>
              <CommandInput placeholder="Search actions" />
              <CommandList>
                <CommandEmpty>No matching actions.</CommandEmpty>
                <CommandGroup heading="Actions">
                  {actions.map((action) => (
                    <CommandItem
                      key={action.id}
                      keywords={[action.keywords]}
                      onSelect={() => {
                        action.run();
                        if (action.id !== 'connect-editors' && action.id !== 'capture-event') {
                          setCommandOpen(false);
                        }
                      }}
                      value={`${action.label} ${action.description} ${action.keywords}`}
                    >
                      <span className="text-sm font-medium text-foreground">{action.label}</span>
                      <span className="text-xs text-muted-foreground">{action.description}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </DialogBody>
        </DialogContent>
      </Dialog>
      <Dialog onOpenChange={setCaptureOpen} open={captureOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture event</DialogTitle>
            <DialogDescription>Log a learning, correction, or note to the hub timeline.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Type</span>
              <Select onChange={(e) => setCaptureType(e.target.value as CaptureEventType)} value={captureType}>
                <option value="note">note</option>
                <option value="success">success</option>
                <option value="failure">failure</option>
                <option value="correction">correction</option>
              </Select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Skill / topic</span>
              <Input
                onChange={(e) => setCaptureSkill(e.target.value)}
                placeholder="e.g. react-patterns"
                value={captureSkill}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Summary</span>
              <Textarea
                onChange={(e) => setCaptureSummary(e.target.value)}
                placeholder="What happened or what did you learn?"
                rows={4}
                value={captureSummary}
              />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setCaptureOpen(false)} variant="secondary">Cancel</Button>
            <Button
              disabled={captureEventMutation.isPending || captureSkill.trim().length === 0 || captureSummary.trim().length === 0}
              onClick={() => captureEventMutation.mutate()}
            >
              {captureEventMutation.isPending ? 'Capturing…' : 'Capture'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}