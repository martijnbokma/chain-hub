import { useEffect, useState, type ReactNode } from 'react';
import {
  ChevronRight,
  Command as CommandIcon,
  FolderTree,
  Link2,
  PanelLeft,
  Settings,
  type LucideIcon
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { ASSET_KIND_LABELS, ASSET_KINDS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import type { AssetKind } from '../../types';
import { ThemeToggle } from '../common/ThemeToggle';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
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
import { ShellToolbarHost, ShellToolbarProvider } from './ShellToolbar';
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

  const { commandOpen, setCommandOpen, actionGroups, integrations, connectedCount } = useCommandPalette();

  return (
    <ShellToolbarProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="gap-3" render={<NavLink to="/" />} size="lg">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-primary font-mono text-xs text-primary">
                    CH
                  </span>
                  <span className="truncate font-display text-xl font-semibold uppercase tracking-wide text-foreground">
                    Chain Hub
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
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
              <kbd className="pointer-events-none rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-3xs leading-none text-muted-foreground group-data-[collapsible=icon]:hidden">
                ⌘K
              </kbd>
            </Button>

            <div className="grid gap-2.5 rounded-2xl border border-border px-3 py-3 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Linked editors</p>
                <span className="font-mono text-2xs tabular-nums text-muted-foreground">
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
                        integration.connected ? 'bg-success' : 'bg-muted-foreground/30'
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

        <SidebarInset className="min-w-0 overflow-x-hidden">
          <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
            <SidebarTrigger />
            <NavLink className="flex items-center gap-3 md:hidden" to="/">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-primary font-mono text-xs text-primary">
                CH
              </span>
              <span className="font-display text-xl font-semibold uppercase tracking-wide text-foreground">
                Chain Hub
              </span>
            </NavLink>
            <ShellToolbarHost className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3" />
            <ThemeToggle />
          </header>
          <main className="min-w-0 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">{children}</main>
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
                    const Icon = action.icon;
                    return (
                      <CommandItem
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
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground group-data-[selected=true]/command-item:text-foreground"
                        />
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="truncate text-sm font-medium text-foreground">
                            {action.label}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {action.description}
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