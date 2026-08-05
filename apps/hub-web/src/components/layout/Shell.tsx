import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Command as CommandIcon, Link2, Sparkles, PanelLeft, FolderTree, BookMarked, Zap, type LucideIcon } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
  SidebarTrigger,
  useSidebar
} from '../ui/sidebar';
import { Textarea } from '../ui/textarea';
import { cn } from '../../lib/utils';
import { integrationsApi, learningsApi } from '../../lib/api';
import type { CaptureEventType, CaptureEvent } from '../../types';

interface ShellProps {
  children: React.ReactNode;
}

interface SidebarNavLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
}

function SidebarNavLink({ to, label, icon: Icon, isActive }: SidebarNavLinkProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="h-9"
        isActive={isActive}
        onClick={() => {
          if (isMobile) {
            setOpenMobile(false);
          }
        }}
        render={<NavLink to={to} />}
        tooltip={label}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
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
        <SidebarHeader className="border-b border-sidebar-border pb-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="gap-2.5" render={<NavLink to="/" />} size="lg">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                  CH
                </span>
                <div className="grid min-w-0 flex-1 items-center text-left leading-tight">
                  <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                    Chain Hub
                  </span>
                  <span className="truncate text-xs text-muted-foreground">Local control plane</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="pt-3">
            <SidebarGroupContent>
              <SidebarMenu>
                {links.map((link) => {
                  const isActive =
                    link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to);

                  return (
                    <SidebarNavLink
                      icon={link.icon}
                      isActive={isActive}
                      key={link.to}
                      label={link.label}
                      to={link.to}
                    />
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-2 border-t border-sidebar-border">
          <Button
            aria-label="Open command menu"
            className={cn(
              'h-9 w-full justify-start gap-2 whitespace-nowrap px-3',
              'group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8',
              'group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0'
            )}
            onClick={() => setCommandOpen(true)}
            variant="secondary"
          >
            <CommandIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left group-data-[collapsible=icon]:hidden">
              Command
            </span>
            <kbd className="pointer-events-none rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground group-data-[collapsible=icon]:hidden">
              ⌘K
            </kbd>
          </Button>

          <div className="grid gap-2.5 rounded-2xl border border-border px-3 py-3 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Linked editors</p>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {connectedCount}/{integrations.data?.length ?? 0}
              </span>
            </div>
            <div className="grid gap-2">
              {(integrations.data ?? []).map((integration) => (
                <div className="flex min-w-0 items-center gap-2.5" key={integration.id}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-1.5 shrink-0 rounded-full',
                      integration.connected ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )}
                  />
                  <span
                    className={cn(
                      'truncate text-xs leading-none',
                      integration.connected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {integration.label}
                  </span>
                </div>
              ))}
              {integrations.data?.length === 0 ? (
                <p className="text-xs text-muted-foreground">No editors linked yet.</p>
              ) : null}
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
          <SidebarTrigger className="size-11 md:size-7" />
          <NavLink className="flex items-center gap-2 md:hidden" to="/">
            <span className="flex aspect-square size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
              CH
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Chain Hub v2
            </span>
          </NavLink>
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