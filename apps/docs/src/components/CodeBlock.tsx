import React, { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CodeBlock(props: React.ComponentProps<'pre'>) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = preRef.current?.textContent ?? '';
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative group">
      <pre ref={preRef} {...props} />
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="absolute top-2 right-2 p-1.5 rounded-sm border border-border bg-card text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground transition-opacity"
      >
        {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
      </button>
    </div>
  );
}
