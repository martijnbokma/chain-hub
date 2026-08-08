import React, { Suspense, useEffect, useState } from 'react';
import { ArrowUp, Check, ClipboardCopy, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

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
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea
} from '@/components/ui/prompt-input';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { AssetKind } from '@/types';

import { contentForClipboard, KIND_META, suggestAssetNameFromText } from './asset-helpers';

export type DraftKindChoice = AssetKind | 'auto';

const MarkdownSourceEditor = React.lazy(async () => {
  const module = await import('@/components/common/MarkdownSourceEditor');
  return { default: module.MarkdownSourceEditor };
});

const INTENT_SUGGESTIONS: Record<AssetKind, readonly string[]> = {
  prompts: [
    'Review a PR for security issues and suggest concrete fixes',
    'Turn messy meeting notes into clear action items',
    'Write a concise commit message from a diff summary',
    'Explain a codebase concept to a junior engineer'
  ],
  skills: [
    'Audit React components for accessibility issues',
    'Refactor messy TypeScript modules with safe steps',
    'Plan and run a careful database migration',
    'Review API design for consistency and error handling'
  ],
  agents: [
    'A careful code reviewer focused on regressions',
    'A senior frontend engineer for React + Tailwind',
    'A debugging partner that asks clarifying questions first',
    'A technical writer that turns diffs into clear changelogs'
  ],
  workflows: [
    'Ship a feature from branch to PR with checklist steps',
    'Triage a production bug from report to fix',
    'Onboard a new package into this monorepo',
    'Prepare a release: changelog, version, and tags'
  ],
  rules: [
    'Always use named exports and avoid barrel files',
    'Prefer Tailwind semantic tokens — no hex or arbitrary px',
    'Keep tests colocated and cover new domain logic',
    'Never commit secrets or modify schema without a plan'
  ]
};

const AUTO_SUGGESTIONS = [
  INTENT_SUGGESTIONS.skills[0],
  INTENT_SUGGESTIONS.prompts[0],
  INTENT_SUGGESTIONS.workflows[0],
  INTENT_SUGGESTIONS.agents[0],
  INTENT_SUGGESTIONS.rules[0]
] as const;

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

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                {isAuto ? 'What should this asset do?' : `What should this ${kindLabel} do?`}
              </span>
              <Link
                className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                to="/settings"
              >
                <Settings2 className="size-3.5" />
                AI settings
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <PromptSuggestion key={suggestion} onClick={() => handleIntentChange(suggestion)} type="button">
                  {suggestion}
                </PromptSuggestion>
              ))}
            </div>

            <PromptInput
              disabled={isDrafting}
              isLoading={isDrafting}
              maxHeight={160}
              onSubmit={() => {
                if (canDraft) {
                  onDraftWithAi();
                }
              }}
              onValueChange={handleIntentChange}
              value={draftIntent}
            >
              <PromptInputTextarea
                placeholder={
                  isAuto
                    ? 'Describe what you need — AI chooses skill, prompt, workflow, agent, or rule…'
                    : `Describe the ${kindLabel} you want to draft…`
                }
              />
              <PromptInputActions className="justify-between pt-1">
                {isDrafting ? (
                  <Loader size="sm" text={thinkingText} variant="loading-dots" />
                ) : (
                  <span className="px-1 text-xs text-muted-foreground">Enter to draft · Shift+Enter for newline</span>
                )}
                <PromptInputAction
                  tooltip={
                    isDrafting
                      ? 'AI is thinking…'
                      : isAuto
                        ? 'Let AI choose form and draft'
                        : `Draft ${kindLabel} with AI`
                  }
                >
                  <Button
                    aria-busy={isDrafting || undefined}
                    aria-label={
                      isDrafting
                        ? 'AI is thinking'
                        : isAuto
                          ? 'Let AI choose form and draft'
                          : `Draft ${kindLabel} with AI`
                    }
                    className="size-8 rounded-xl p-0"
                    disabled={!canDraft}
                    onClick={onDraftWithAi}
                    size="icon-sm"
                    type="button"
                  >
                    {isDrafting ? <Loader size="sm" variant="circular" /> : <ArrowUp className="size-4" />}
                  </Button>
                </PromptInputAction>
              </PromptInputActions>
            </PromptInput>

            {isDrafting ? (
              <div
                aria-live="polite"
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-3 py-2.5"
                role="status"
              >
                <Loader size="sm" variant="typing" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{thinkingText}</p>
                  <p className="text-xs text-muted-foreground">
                    {isAuto
                      ? 'This may take a moment — Hub classifies first, then writes the draft.'
                      : 'Hang tight while the draft is written.'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

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
                <MarkdownSourceEditor
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
          <Button disabled={isSubmitting || !canCreate} onClick={onSubmit}>
            {isSubmitting ? 'Creating…' : isAuto && kindReason ? `Create ${resolvedKind}` : 'Create asset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
