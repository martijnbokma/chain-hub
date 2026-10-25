import { useEffect, useState } from 'react';
import { ChevronRight, FolderTree, type LucideIcon } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { ASSET_KIND_LABELS, ASSET_KINDS } from '../../lib/constants';
import { cn } from '../../lib/utils';
import type { AssetKind } from '../../types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar
} from '../ui/sidebar';

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

export function SidebarNavLink({ to, label, icon: Icon, isActive }: SidebarNavLinkProps) {
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

export function LibraryNavItem() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const isLibraryRoute = location.pathname.startsWith('/library');
  const kindParam = new URLSearchParams(location.search).get('kind');
  const activeKind = isLibraryRoute && isAssetKind(kindParam) ? kindParam : null;
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
