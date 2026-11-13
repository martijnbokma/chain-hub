import { ArrowUp, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea
} from '@/components/ui/prompt-input';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';

interface IntentDraftSectionProps {
  isAuto: boolean;
  kindLabel: string;
  suggestions: readonly string[];
  draftIntent: string;
  isDrafting: boolean;
  canDraft: boolean;
  thinkingText: string;
  onIntentChange: (value: string) => void;
  onDraftWithAi: () => void;
}

/** Intent + AI-draft block of the create-asset dialog. */
export function IntentDraftSection({
  isAuto,
  kindLabel,
  suggestions,
  draftIntent,
  isDrafting,
  canDraft,
  thinkingText,
  onIntentChange,
  onDraftWithAi
}: IntentDraftSectionProps) {
  return (
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
          <PromptSuggestion key={suggestion} onClick={() => onIntentChange(suggestion)} type="button">
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
        onValueChange={onIntentChange}
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
  );
}
