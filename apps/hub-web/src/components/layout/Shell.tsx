import type { ReactNode } from 'react';
import { Command as CommandIcon, Link2, PanelLeft, FolderTree, Settings, type LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { ThemeToggle } from '../common/ThemeToggle';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
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
import { cn } from '../../lib/utils';
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
  const location = useLocation();

  const { commandOpen, setCommandOpen, actions, integrations, connectedCount } = useCommandPalette();

  const links = [
    { to: '/', label: 'Overview', icon: PanelLeft },
    { to: '/library', label: 'Library', icon: FolderTree },
    { to: '/integrations', label: 'Integrations', icon: Link2 },
    { to: '/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <ShellToolbarProvider>
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

        <SidebarInset>
          <header className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
            <SidebarTrigger className="size-11 md:size-7" />
            <NavLink
              className={cn(
                'items-center gap-2 md:hidden',
                location.pathname.startsWith('/library') ? 'hidden' : 'flex'
              )}
              to="/"
            >
              <span className="flex aspect-square size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                CH
              </span>
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Chain Hub v2
              </span>
            </NavLink>
            <ShellToolbarHost className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3" />
            <ThemeToggle />
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
      </SidebarProvider>
    </ShellToolbarProvider>
  );
}