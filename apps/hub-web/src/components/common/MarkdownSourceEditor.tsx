import React, { useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { tags as t } from '@lezer/highlight';

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
  { tag: t.heading, color: '#18181b', fontWeight: '600' },
  { tag: t.strong, color: '#18181b', fontWeight: '600' },
  { tag: t.emphasis, color: '#3f3f46', fontStyle: 'italic' },
  { tag: t.link, color: '#ea580c' },
  { tag: t.url, color: '#71717a' },
  { tag: t.monospace, color: '#3f3f46' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.quote, color: '#71717a', fontStyle: 'italic' },
  { tag: t.list, color: '#f97316' },
  { tag: t.meta, color: '#a1a1aa' },
  { tag: t.comment, color: '#a1a1aa' },
  { tag: t.keyword, color: '#ea580c' },
  { tag: t.string, color: '#0f766e' },
  { tag: t.number, color: '#b45309' },
  { tag: t.bool, color: '#b45309' },
  { tag: t.atom, color: '#b45309' },
  { tag: t.propertyName, color: '#18181b' },
  { tag: t.variableName, color: '#18181b' },
  { tag: t.typeName, color: '#0f766e' },
  { tag: t.operator, color: '#71717a' },
  { tag: t.punctuation, color: '#71717a' },
  { tag: t.contentSeparator, color: '#d4d4d8' },
  { tag: t.processingInstruction, color: '#71717a' },
  { tag: t.labelName, color: '#ea580c' }
]);

const coolTrustTheme = EditorView.theme(
  {
    '&': {
      color: '#18181b',
      backgroundColor: '#fafafa',
      fontSize: '12px',
      height: '100%'
    },
    '.cm-content': {
      fontFamily: 'var(--font-mono)',
      caretColor: '#f97316',
      lineHeight: '1.5',
      padding: '12px 0'
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#f97316'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'color-mix(in srgb, #f97316 14%, transparent)'
    },
    '.cm-activeLine': {
      backgroundColor: '#f4f4f5'
    },
    '.cm-gutters': {
      backgroundColor: '#fafafa',
      color: '#a1a1aa',
      border: 'none',
      borderRight: '1px solid #e4e4e7',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px'
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#f4f4f5',
      color: '#71717a'
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
      backgroundColor: 'color-mix(in srgb, #f97316 18%, transparent)',
      outline: 'none'
    },
    '.cm-tooltip': {
      backgroundColor: '#ffffff',
      border: '1px solid #e4e4e7',
      borderRadius: '10px',
      color: '#18181b',
      boxShadow: 'var(--shadow-popover)'
    },
    '.cm-panels': {
      backgroundColor: '#ffffff',
      color: '#18181b'
    },
    '.cm-foldPlaceholder': {
      backgroundColor: '#f4f4f5',
      border: 'none',
      color: '#71717a'
    }
  },
  { dark: false }
);

export function MarkdownSourceEditor({
  value,
  onChange,
  onSave,
  readOnly = false,
  className,
  'aria-label': ariaLabel = 'Markdown source editor'
}: MarkdownSourceEditorProps) {
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const extensions = useMemo(
    () => [
      markdown({ base: markdownLanguage }),
      coolTrustTheme,
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
    [readOnly]
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
