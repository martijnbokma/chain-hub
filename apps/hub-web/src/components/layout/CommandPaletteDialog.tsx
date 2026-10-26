import { LoaderCircle } from 'lucide-react';
import type { useMutation } from '@tanstack/react-query';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn } from '../../lib/utils';
import type { integrationsApi } from '../../lib/api';
import type { CommandActionGroup } from './command-palette-actions';

type ConnectEditorsMutation = ReturnType<typeof useMutation<Awaited<ReturnType<typeof integrationsApi.setup>>, Error, void>>;

interface CommandPaletteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionGroups: { group: CommandActionGroup; actions: import('./command-palette-actions').CommandAction[] }[];
  connectEditors: ConnectEditorsMutation;
}

export function CommandPaletteDialog({
  open,
  onOpenChange,
  actionGroups,
  connectEditors
}: CommandPaletteDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
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
                          onOpenChange(false);
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
  );
}
