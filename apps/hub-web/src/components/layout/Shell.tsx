import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  ChevronRight,
  Command as CommandIcon,
  FolderTree,
  LayoutDashboard,
  Link2,
  LoaderCircle,
  Settings,
  Store,
  type LucideIcon
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { ASSET_KIND_LABELS, ASSET_KINDS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import type { AssetKind } from '../../types';
import { ThemeToggle } from '../common/ThemeToggle';
import { ChainHubLogo } from '../ui/ChainHubLogo';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { TooltipProvider } from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '../ui/sidebar';
import { ShellToolbarProvider } from './ShellToolbar';
import { useCommandPalette } from './useCommandPalette';

interface ShellProps {
  children: ReactNode;
}

interface SidebarNavLinkProps {
  to: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
}

function closeMobileSidebar(isMobile: boolean, setOpenMobile: (open: boolean) => void) {
  if (isMobile) {
    setOpenMobile(false);
  }
}

function isAssetKind(value: string | null): value is AssetKind {
  return value !== null && (ASSET_KINDS as readonly string[]).includes(value);
}

function SidebarNavLink({ to, label, icon: Icon, isActive }: SidebarNavLinkProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="h-9"
        isActive={isActive}
        onClick={() => {
          closeMobileSidebar(isMobile, setOpenMobile);
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

function LibraryNavItem() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const isLibraryRoute = location.pathname.startsWith('/library');
  const kindParam = new URLSearchParams(location.search).get('kind');
  const activeKind = isAssetKind(kindParam) ? kindParam : null;
  const [open, setOpen] = useState(isLibraryRoute);
  const isIconCollapsed = state === 'collapsed' && !isMobile;

  useEffect(() => {
    if (isLibraryRoute) {
      setOpen(true);
    }
  }, [isLibraryRoute]);

  if (isIconCollapsed) {
    return (
      <SidebarMenuItem>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger
            aria-label="Library"
            className={cn(
              'flex size-8 items-center justify-center rounded-xl text-sidebar-foreground outline-hidden ring-sidebar-ring transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2',
              'data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground',
              '[&_svg]:size-4 [&_svg]:shrink-0',
              isLibraryRoute && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
            )}
          >
            <FolderTree />
            <span className="sr-only">Library</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44 rounded-xl" side="right" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Library</DropdownMenuLabel>
              <DropdownMenuItem
                className={cn(isLibraryRoute && activeKind === null && 'bg-accent text-accent-foreground')}
                onClick={() => {
                  navigate('/library');
                }}
              >
                All assets
              </DropdownMenuItem>
              {ASSET_KINDS.map((kind) => (
                <DropdownMenuItem
                  className={cn(activeKind === kind && 'bg-accent text-accent-foreground')}
                  key={kind}
                  onClick={() => {
                    navigate(`/library?kind=${kind}`);
                  }}
                >
                  {ASSET_KIND_LABELS[kind]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible className="group/collapsible w-full" onOpenChange={setOpen} open={open}>
        <div className="flex w-full items-center gap-0.5">
          <SidebarMenuButton
            className="h-9 min-w-0 flex-1"
            isActive={isLibraryRoute && activeKind === null}
            onClick={() => {
              setOpen(true);
              closeMobileSidebar(isMobile, setOpenMobile);
            }}
            render={<NavLink to="/library" />}
            tooltip="Library"
          >
            <FolderTree />
            <span>Library</span>
          </SidebarMenuButton>
          <CollapsibleTrigger
            aria-label="Toggle Library kinds"
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              'outline-hidden ring-sidebar-ring focus-visible:ring-2'
            )}
          >
            <ChevronRight className="size-4 transition-transform group-data-open/collapsible:rotate-90" />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <SidebarMenuSub>
            {ASSET_KINDS.map((kind) => (
              <SidebarMenuSubItem key={kind}>
                <SidebarMenuSubButton
                  isActive={activeKind === kind}
                  onClick={() => {
                    closeMobileSidebar(isMobile, setOpenMobile);
                  }}
                  render={<NavLink to={`/library?kind=${kind}`} />}
                >
                  <span>{ASSET_KIND_LABELS[kind]}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function Shell({ children }: ShellProps) {
  const location = useLocation();

  const { commandOpen, setCommandOpen, actionGroups, installedEditors, connectedCount, connectEditors } = useCommandPalette();

  return (
    <ShellToolbarProvider>
      <SidebarProvider>
        <TooltipProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">
            <div className="flex items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:hidden">
              <NavLink
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                to="/"
              >
                <ChainHubLogo showText={false} className="size-8! shrink-0" />
                <span className="truncate font-sans text-lg font-semibold tracking-tight text-foreground">
                  Chain Hub
                </span>
              </NavLink>
              <SidebarTrigger className="hidden md:flex size-8 shrink-0" />
            </div>
            {/* Collapsed: logo stays visible; hovering it reveals the expand toggle */}
            <div className="group/logo relative hidden size-8 group-data-[collapsible=icon]:block">
              <span className="flex size-8 items-center justify-center transition-opacity duration-150 group-hover/logo:opacity-0">
                <ChainHubLogo showText={false} className="size-7" />
              </span>
              <SidebarTrigger
                aria-label="Expand sidebar"
                className="absolute inset-0 size-8 opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100 focus-visible:opacity-100"
              />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup className="pt-3">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarNavLink
                    icon={PanelLeft}
                    isActive={location.pathname === '/'}
                    label="Overview"
                    to="/"
                  />
                  <LibraryNavItem />
                  <SidebarNavLink
                    icon={Activity}
                    isActive={location.pathname.startsWith('/learnings')}
                    label="Learnings"
                    to="/learnings"
                  />
                  <SidebarNavLink
                    icon={Link2}
                    isActive={location.pathname.startsWith('/integrations')}
                    label="Integrations"
                    to="/integrations"
                  />
                  <SidebarNavLink
                    icon={Settings}
                    isActive={location.pathname.startsWith('/settings')}
                    label="Settings"
                    to="/settings"
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="gap-2 border-t border-sidebar-border">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
              <Button
                aria-label="Open command menu"
                className={cn(
                  'h-9 flex-1 justify-start gap-2 whitespace-nowrap px-3',
                  'group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8',
                  'group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center',
                  'group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:p-0'
                )}
                onClick={() => setCommandOpen(true)}
                variant="secondary"
              >
                <CommandIcon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-left group-data-[collapsible=icon]:hidden">
                  Command
                </span>
                <kbd className="pointer-events-none rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-3xs leading-none text-muted-foreground group-data-[collapsible=icon]:hidden">
                  ⌘K
                </kbd>
              </Button>
              <ThemeToggle className="group-data-[collapsible=icon]:size-8" />
            </div>

            <div className="grid gap-2.5 rounded-2xl border border-border px-3 py-3 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Linked editors</p>
                <span className="font-mono text-2xs tabular-nums text-muted-foreground">
                  {connectedCount}/{installedEditors.length}
                </span>
              </div>
              <div className="grid gap-2">
                {installedEditors.map((integration) => (
                  <div className="flex min-w-0 items-center gap-2.5" key={integration.id}>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        integration.connected ? 'bg-success' : 'bg-muted-foreground/30',
                        !integration.connected && connectEditors.isPending && 'animate-pulse'
                      )}
                    />
                    <span
                      className={cn(
                        'truncate text-xs leading-none',
                        integration.connected ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {integration.label}
                      <span className="sr-only">{integration.connected ? ' (connected)' : ' (not connected)'}</span>
                    </span>
                  </div>
                ))}
                {installedEditors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No supported editor found on this machine.</p>
                ) : null}
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        </TooltipProvider>

        <SidebarInset className="min-w-0 overflow-x-hidden">
          {/* Mobile-only navigation bar */}
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 md:hidden">
            <div className="flex items-center gap-2.5">
              <SidebarTrigger />
              <NavLink className="flex items-center gap-2" to="/">
                <ChainHubLogo showText={false} className="size-6 shrink-0" />
                <span className="font-sans text-base font-semibold tracking-tight text-foreground">
                  Chain Hub
                </span>
              </NavLink>
            </div>
            <ThemeToggle className="size-8" />
          </div>
          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </main>
        </SidebarInset>

      <Dialog
        onOpenChange={(open) => {
          setCommandOpen(open);
        }}
        open={commandOpen}
      >
        <DialogContent className="max-w-lg overflow-hidden p-0" showCloseButton={false}>
          <DialogHeader className="sr-only">
            <DialogTitle>Command palette</DialogTitle>
            <DialogDescription>
              Jump through the hub and trigger common actions without hunting through screens.
            </DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Search actions…" />
            <CommandList>
              <CommandEmpty>No matching actions.</CommandEmpty>
              {actionGroups.map(({ group, actions: groupActions }) => (
                <CommandGroup heading={group} key={group}>
                  {groupActions.map((action) => {
                    const isConnecting = action.id === 'connect-editors' && connectEditors.isPending;
                    const Icon = isConnecting ? LoaderCircle : action.icon;
                    return (
                      <CommandItem
                        disabled={isConnecting}
                        key={action.id}
                        keywords={[action.keywords]}
                        onSelect={() => {
                          action.run();
                          if (action.id !== 'connect-editors') {
                            setCommandOpen(false);
                          }
                        }}
                        value={`${action.label} ${action.description} ${action.keywords}`}
                      >
                        <Icon
                          aria-hidden="true"
                          className={cn(
                            'mt-0.5 size-4 shrink-0 text-muted-foreground group-data-[selected=true]/command-item:text-foreground',
                            isConnecting && 'animate-spin'
                          )}
                        />
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="truncate text-sm font-medium text-foreground">
                            {isConnecting ? 'Connecting…' : action.label}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {isConnecting ? 'Linking installed editors to the hub.' : action.description}
                          </span>
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
            <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-3xs leading-none">
                  ↑↓
                </kbd>
                move
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-3xs leading-none">
                  ↵
                </kbd>
                run
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-3xs leading-none">
                  esc
                </kbd>
                close
              </span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
      </SidebarProvider>
    </ShellToolbarProvider>
  );
}