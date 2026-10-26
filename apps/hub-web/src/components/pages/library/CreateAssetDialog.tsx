import { Suspense, useEffect, useState } from 'react';
import { Check, ClipboardCopy } from 'lucide-react';
import { toast } from 'sonner';

import { LazyMarkdownSourceEditor } from '@/components/common/LazyMarkdownSourceEditor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/loader';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { AssetKind } from '@/types';

import { contentForClipboard, KIND_META } from './asset-helpers';
import { suggestAssetNameFromText } from './asset-name';
import { AUTO_SUGGESTIONS, INTENT_SUGGESTIONS } from './create-asset-suggestions';
import { IntentDraftSection } from './IntentDraftSection';

export type DraftKindChoice = AssetKind | 'auto';

interface CreateAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftName: string;
  onDraftNameChange: (value: string) => void;
  draftNameLocked: boolean;
  onDraftNameLockedChange: (locked: boolean) => void;
  draftKindChoice: DraftKindChoice;
  onDraftKindChoiceChange: (value: DraftKindChoice) => void;
  resolvedKind: AssetKind;
  kindReason: string | null;
  draftContent: string;
  onDraftContentChange: (value: string) => void;
  draftIntent: string;
  onDraftIntentChange: (value: string) => void;
  onDraftWithAi: () => void;
  isDrafting: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function CreateAssetDialog({
  open,
  onOpenChange,
  draftName,
  onDraftNameChange,
  draftNameLocked,
  onDraftNameLockedChange,
  draftKindChoice,
  onDraftKindChoiceChange,
  resolvedKind,
  kindReason,
  draftContent,
  onDraftContentChange,
  draftIntent,
  onDraftIntentChange,
  onDraftWithAi,
  isDrafting,
  onSubmit,
  isSubmitting
}: CreateAssetDialogProps) {
  const canDraft = draftIntent.trim().length > 0 && !isDrafting;
  const [copied, setCopied] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const isAuto = draftKindChoice === 'auto';
  const kindLabel = isAuto ? 'asset' : KIND_META[draftKindChoice].label.toLowerCase();
  const suggestions = isAuto ? AUTO_SUGGESTIONS : INTENT_SUGGESTIONS[draftKindChoice];
  const canCreate =
    draftName.trim().length > 0 && (!isAuto || Boolean(kindReason)) && draftContent.trim().length > 0;
  const isPromptDraft = resolvedKind === 'prompts';
  const thinkingMessages = isAuto
    ? (['Thinking about the best form…', 'Choosing skill, prompt, workflow, agent, or rule…', 'Drafting the asset…'] as const)
    : ([`Thinking…`, `Drafting your ${kindLabel}…`, 'Almost ready…'] as const);
  const thinkingText = thinkingMessages[thinkingStep % thinkingMessages.length];

  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!isDrafting) {
      setThinkingStep(0);
      return;
    }
    const timer = window.setInterval(() => {
      setThinkingStep((step) => step + 1);
    }, 2200);
    return () => window.clearInterval(timer);
  }, [isDrafting]);

  async function handleCopyDraft() {
    const text = contentForClipboard(draftContent, resolvedKind).trim();
    if (!text) {
      toast.error(isPromptDraft ? 'Nothing to copy yet' : 'Content is empty');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(isPromptDraft ? 'Prompt copied' : 'Content copied');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  const syncNameFromIntent = (intent: string) => {
    if (draftNameLocked) {
      return;
    }
    onDraftNameChange(suggestAssetNameFromText(intent));
  };

  const handleIntentChange = (value: string) => {
    onDraftIntentChange(value);
    syncNameFromIntent(value);
  };

  const handleKindChange = (value: DraftKindChoice) => {
    onDraftKindChoiceChange(value);
    if (!draftNameLocked && draftIntent.trim()) {
      onDraftNameChange(suggestAssetNameFromText(draftIntent));
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create asset</DialogTitle>
          <DialogDescription>Add a new portable asset to the local hub without leaving the library workspace.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <label className="grid gap-2">
            <span className="text-sm text-muted-foreground">Name</span>
            <Input
              onChange={(event) => {
                const next = event.target.value;
                onDraftNameChange(next);
                onDraftNameLockedChange(next.trim().length > 0);
              }}
              placeholder="auto from intent…"
              value={draftName}
            />
            {!draftNameLocked ? (
              <span className="text-xs text-muted-foreground">
                Auto-filled from your intent — AI improves it after draft. Edit to lock the name.
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Name locked — clear the field to unlock auto-naming.</span>
            )}
          </label>
          <div className="grid gap-2">
            <label className="grid gap-2">
              <span className="text-sm text-muted-foreground">Kind</span>
              <Select
                value={draftKindChoice}
                onChange={(event) => handleKindChange(event.target.value as DraftKindChoice)}
              >
                <option value="auto">Auto (AI chooses)</option>
                <option value="skills">skills</option>
                <option value="agents">agents</option>
                <option value="workflows">workflows</option>
                <option value="rules">rules</option>
                <option value="prompts">prompts</option>
              </Select>
            </label>
            {isAuto && kindReason ? (
              <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">→ {KIND_META[resolvedKind].label}</span>
                {' — '}
                {kindReason}
              </p>
            ) : null}
            {isAuto && !kindReason ? (
              <span className="text-xs text-muted-foreground">
                Describe your intent and draft with AI — Hub picks the best form.
              </span>
            ) : null}
          </div>

          <IntentDraftSection
            canDraft={canDraft}
            draftIntent={draftIntent}
            isAuto={isAuto}
            isDrafting={isDrafting}
            kindLabel={kindLabel}
            onDraftWithAi={onDraftWithAi}
            onIntentChange={handleIntentChange}
            suggestions={suggestions}
            thinkingText={thinkingText}
          />

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Content</span>
              <Button
                disabled={isDrafting || !draftContent.trim()}
                onClick={() => {
                  void handleCopyDraft();
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                {copied ? <Check className="size-3.5" /> : <ClipboardCopy className="size-3.5" />}
                {copied ? 'Copied' : isPromptDraft ? 'Copy prompt' : 'Copy'}
              </Button>
            </div>
            <div className="relative">
              <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
                <LazyMarkdownSourceEditor
                  aria-label="Asset markdown content"
                  className={isDrafting ? 'h-64 opacity-50' : 'h-64'}
                  onChange={onDraftContentChange}
                  readOnly={isDrafting}
                  value={draftContent}
                />
              </Suspense>
              {isDrafting ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
                  <Loader size="md" text="Writing draft" variant="loading-dots" />
                </div>
              ) : null}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="secondary">
            Cancel
          </Button>
          <Button disabled={!canCreate} loading={isSubmitting} onClick={onSubmit}>
            {isSubmitting ? 'Creating…' : isAuto && kindReason ? `Create ${resolvedKind}` : 'Create asset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
