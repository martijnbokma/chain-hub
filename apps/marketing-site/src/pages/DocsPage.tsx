import React from 'react';
import { FolderTree, Terminal } from 'lucide-react';
import { SheetMarks, TitleblockBar } from '../components/PageChrome';

type TreeLine = { depth: number; name: string; comment?: string };

const HUB_TREE: TreeLine[] = [
  { depth: 0, name: '~/.chain-hub/' },
  { depth: 1, name: 'skills/', comment: 'SKILL.md files' },
  { depth: 1, name: 'agents/', comment: 'Agent persona files' },
  { depth: 1, name: 'workflows/', comment: 'Workflow .md files' },
  { depth: 1, name: 'rules/', comment: 'Rule files' },
  { depth: 1, name: 'memory/', comment: 'Markdown notes + learnings' },
  { depth: 2, name: 'learnings/' },
  { depth: 3, name: 'events.jsonl', comment: 'Append-only capture log' },
  { depth: 2, name: 'reflections/', comment: 'Written reflection snapshots' },
  { depth: 1, name: 'system/', comment: 'Metadata' },
  { depth: 2, name: 'chainhub.sqlite', comment: 'SQLite metadata index' },
  { depth: 2, name: 'meta.json', comment: 'Initialization metadata' },
  { depth: 1, name: 'logs/', comment: 'Application logs' },
];

type Command = { cmd: string; description: string };

const COMMAND_GROUPS: { label: string; ref: string; commands: Command[] }[] = [
  {
    label: 'Setup & status',
    ref: 'REF 01',
    commands: [
      { cmd: 'chain init', description: 'Initialize hub structure' },
      { cmd: 'chain status', description: 'JSON overview of hub state' },
      { cmd: 'chain validate', description: 'Check structural integrity' },
      { cmd: 'chain setup', description: 'Create editor symlinks' },
      { cmd: 'chain guide', description: 'Show setup checklist' },
      { cmd: 'chain hub [--port N] [--no-open]', description: 'Start local dashboard (port 2342 default)' },
    ],
  },
  {
    label: 'Asset management',
    ref: 'REF 02',
    commands: [
      { cmd: 'chain asset list [--kind <kind>]', description: 'List assets, optionally filtered by kind' },
      { cmd: 'chain asset create --kind <kind> --name <name> --content <text>', description: 'Create a new asset' },
      { cmd: 'chain asset show --kind <kind> --name <name>', description: 'Show an asset' },
      { cmd: 'chain asset update --kind <kind> --name <name> --content <text>', description: 'Update an asset' },
      { cmd: 'chain asset remove --kind <kind> --name <name>', description: 'Remove an asset' },
    ],
  },
  {
    label: 'Learnings',
    ref: 'REF 03',
    commands: [
      {
        cmd: 'chain capture --event <type> --skill <slug> --summary "<text>"',
        description: 'Capture a learning event (types: success, failure, correction, note)',
      },
      { cmd: 'chain reflect', description: 'Per-skill reflection report' },
      { cmd: 'chain reflect --write', description: 'Write reflection to file' },
      { cmd: 'chain reflect --json', description: 'Raw JSON output' },
    ],
  },
];

const ASSET_KINDS = ['skills', 'agents', 'workflows', 'rules', 'prompts'];

export function DocsPage() {
  return (
    <div className="min-h-screen">
      <TitleblockBar />

      {/* Hero */}
      <section className="relative">
        <SheetMarks />
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h1 className="font-display font-bold text-5xl md:text-6xl leading-[0.95] uppercase text-foreground mb-6">
            How Chain Hub works
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            One hub folder on disk (<code className="font-mono text-foreground">~/.chain-hub</code>) is
            the single source of truth. The CLI reads and writes it directly; the dashboard is a
            local visual layer on top. Every editor you connect just reads a synced copy.
          </p>
          <div className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase border-t border-border pt-4 mt-10 flex flex-wrap gap-x-6 gap-y-1">
            <span>Sheet 1/1</span>
            <span>Documentation</span>
            <span>Scale 1:1</span>
            <span>Chain Hub</span>
          </div>
        </div>
      </section>

      {/* Hub folder structure */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-b border-border">
        <div className="flex items-center gap-3 mb-8">
          <FolderTree size={18} className="text-primary" />
          <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            Hub folder structure — override with CHAIN_HOME
          </h2>
        </div>
        <div className="bp-corners border border-border rounded-sm bg-card p-6 overflow-x-auto">
          <pre className="font-mono text-sm leading-relaxed">
            {HUB_TREE.map((line, i) => (
              <div key={i} className="flex items-baseline gap-4 whitespace-pre">
                <span className="text-foreground">
                  {'  '.repeat(line.depth)}
                  {line.name}
                </span>
                {line.comment && (
                  <span className="text-muted-foreground text-xs">{line.comment}</span>
                )}
              </div>
            ))}
          </pre>
        </div>
      </section>

      {/* CLI commands */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-8">
          <Terminal size={18} className="text-primary" />
          <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            CLI commands — the chain binary
          </h2>
        </div>
        <div className="space-y-8">
          {COMMAND_GROUPS.map((group) => (
            <div key={group.label} className="bp-corners border border-border rounded-sm divide-y divide-border">
              <div className="flex items-center gap-3 px-5 py-4 bg-secondary/50">
                <span className="font-mono text-[10px] text-muted-foreground tracking-widest w-14 shrink-0">
                  {group.ref}
                </span>
                <h3 className="font-display font-semibold text-base uppercase tracking-wide text-foreground">
                  {group.label}
                </h3>
              </div>
              {group.commands.map((command) => (
                <div
                  key={command.cmd}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-5 py-4"
                >
                  <code className="font-mono text-sm text-primary sm:w-[26rem] shrink-0 break-all">
                    {command.cmd}
                  </code>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {command.description}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-8">
          Asset kinds:{' '}
          {ASSET_KINDS.map((kind, i) => (
            <span key={kind}>
              <code className="font-mono text-foreground">{kind}</code>
              {i < ASSET_KINDS.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-sm text-muted-foreground">
        More detail lives in the repo's <code className="font-mono">CLAUDE.md</code> and{' '}
        <code className="font-mono">docs/</code> folder.
      </footer>
    </div>
  );
}
