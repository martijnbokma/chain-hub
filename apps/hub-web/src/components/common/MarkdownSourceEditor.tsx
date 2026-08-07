import React, { useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { tags as t } from '@lezer/highlight';

import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

interface MarkdownSourceEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  className?: string;
  'aria-label'?: string;
}

const coolTrustHighlight = HighlightStyle.define([
  { tag: t.heading, color: 'var(--color-foreground)', fontWeight: '600' },
  { tag: t.strong, color: 'var(--color-foreground)', fontWeight: '600' },
  { tag: t.emphasis, color: 'var(--color-muted-foreground)', fontStyle: 'italic' },
  { tag: t.link, color: 'var(--color-primary)' },
  { tag: t.url, color: 'var(--color-muted-foreground)' },
  { tag: t.monospace, color: 'var(--color-muted-foreground)' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.quote, color: 'var(--color-muted-foreground)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--color-primary)' },
  { tag: t.meta, color: 'var(--color-muted-foreground)' },
  { tag: t.comment, color: 'var(--color-muted-foreground)' },
  { tag: t.keyword, color: 'var(--color-primary)' },
  { tag: t.string, color: 'var(--color-success-foreground)' },
  { tag: t.number, color: 'var(--color-warning-foreground)' },
  { tag: t.bool, color: 'var(--color-warning-foreground)' },
  { tag: t.atom, color: 'var(--color-warning-foreground)' },
  { tag: t.propertyName, color: 'var(--color-foreground)' },
  { tag: t.variableName, color: 'var(--color-foreground)' },
  { tag: t.typeName, color: 'var(--color-success-foreground)' },
  { tag: t.operator, color: 'var(--color-muted-foreground)' },
  { tag: t.punctuation, color: 'var(--color-muted-foreground)' },
  { tag: t.contentSeparator, color: 'var(--color-border)' },
  { tag: t.processingInstruction, color: 'var(--color-muted-foreground)' },
  { tag: t.labelName, color: 'var(--color-primary)' }
]);

function createCoolTrustTheme(isDark: boolean) {
  return EditorView.theme(
    {
      '&': {
        color: 'var(--color-foreground)',
        backgroundColor: 'var(--color-background)',
        fontSize: '12px',
        height: '100%'
      },
      '.cm-content': {
        fontFamily: 'var(--font-mono)',
        caretColor: 'var(--color-primary)',
        lineHeight: '1.5',
        padding: '12px 0'
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--color-primary)'
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'color-mix(in srgb, var(--color-primary) 14%, transparent)'
      },
      '.cm-activeLine': {
        backgroundColor: 'var(--color-muted)'
      },
      '.cm-gutters': {
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-muted-foreground)',
        border: 'none',
        borderRight: '1px solid var(--color-border)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px'
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--color-muted)',
        color: 'var(--color-muted-foreground)'
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 12px 0 8px',
        minWidth: '2.5rem'
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'var(--font-mono)'
      },
      '&.cm-focused': {
        outline: 'none'
      },
      '.cm-matchingBracket, .cm-nonmatchingBracket': {
        backgroundColor: 'color-mix(in srgb, var(--color-primary) 18%, transparent)',
        outline: 'none'
      },
      '.cm-tooltip': {
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '10px',
        color: 'var(--color-foreground)',
        boxShadow: 'var(--shadow-popover)'
      },
      '.cm-panels': {
        backgroundColor: 'var(--color-card)',
        color: 'var(--color-foreground)'
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'var(--color-muted)',
        border: 'none',
        color: 'var(--color-muted-foreground)'
      }
    },
    { dark: isDark }
  );
}

export function MarkdownSourceEditor({
  value,
  onChange,
  onSave,
  readOnly = false,
  className,
  'aria-label': ariaLabel = 'Markdown source editor'
}: MarkdownSourceEditorProps) {
  const { isDark } = useTheme();
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      createCoolTrustTheme(isDark),
      syntaxHighlighting(coolTrustHighlight),
      EditorView.lineWrapping,
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-s',
            run: () => {
              if (readOnly) {
                return true;
              }
              onSaveRef.current?.();
              return true;
            }
          }
        ])
      )
    ],
    [isDark, readOnly]
  );

  return (
    <div
      aria-label={ariaLabel}
      aria-readonly={readOnly || undefined}
      className={cn(
        'h-full min-h-50 overflow-hidden rounded-xl border border-border bg-background transition-colors',
        'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
        readOnly && 'bg-muted/30',
        className
      )}
      role="group"
    >
      <CodeMirror
        basicSetup={{
          foldGutter: false,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
          lineNumbers: true,
          searchKeymap: true
        }}
        className="h-full text-xs [&_.cm-editor]:h-full [&_.cm-scroller]:h-full"
        editable={!readOnly}
        extensions={extensions}
        height="100%"
        onChange={onChange}
        readOnly={readOnly}
        theme="none"
        value={value}
      />
    </div>
  );
}
