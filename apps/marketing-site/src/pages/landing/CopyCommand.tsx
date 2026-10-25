import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { BAND_VARS } from './bandVars';

/** Command strip — drawn as an ink terminal bar, with copy-to-clipboard. */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }, [command]);

  return (
    <div className="flex items-center justify-between gap-3 bg-band px-3 py-2.5" style={BAND_VARS}>
      <span className="font-mono text-[13px] text-foreground truncate" title={command}>
        <span className="text-primary select-none">~ $ </span>
        {command}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy command: ${command}`}
        className="shrink-0 p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
        <span role="status" className="sr-only">
          {copied ? 'Copied' : ''}
        </span>
      </button>
    </div>
  );
}
