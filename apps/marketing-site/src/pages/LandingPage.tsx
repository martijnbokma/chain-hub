import {
  BookOpen,
  Bot,
  Workflow,
  ScrollText,
  FileText,
  Heart,
  Link2,
  Terminal,
  LayoutDashboard,
  Sparkles,
  HardDrive,
  Cloud,
} from 'lucide-react';
import { GithubIcon, SheetMarks, TitleblockBar } from '../components/PageChrome';
import { DashboardProof } from './landing/DashboardProof';
import { HubSchematic } from './landing/HubSchematic';

const REPO_URL = 'https://github.com/martijnbokma/chain-hub';

const assets = [
  { icon: BookOpen, name: 'Skills', description: 'Reusable capabilities your editor can invoke on demand.' },
  { icon: Bot, name: 'Agents', description: 'Personas and behavior presets tuned for specific work.' },
  { icon: Workflow, name: 'Workflows', description: 'Multi-step processes captured once, run everywhere.' },
  { icon: ScrollText, name: 'Rules', description: 'Guardrails and conventions your AI tools always follow.' },
  { icon: FileText, name: 'Prompts', description: 'One-shot reusable prompt text for a specific task.' },
  { icon: Link2, name: 'Editor connections', description: 'One source of truth, linked into every editor you use.' },
];

const aiProviders = [
  { icon: HardDrive, name: 'Ollama', description: 'Local model. No API key, nothing leaves your machine.' },
  { icon: Cloud, name: 'Anthropic', description: 'Claude models via your own API key.' },
  { icon: Cloud, name: 'OpenAI', description: 'GPT models via your own API key.' },
  { icon: Cloud, name: 'Mistral', description: 'Mistral models via your own API key.' },
  { icon: Cloud, name: 'Gemini', description: 'Gemini models via your own API key.' },
  { icon: Cloud, name: 'Groq', description: 'Fast Llama and Mixtral inference.' },
  { icon: Cloud, name: 'OpenRouter', description: 'Access any open or proprietary model.' },
  { icon: Cloud, name: 'DeepSeek', description: 'DeepSeek models via your own API key.' },
  { icon: Cloud, name: 'Cerebras', description: 'Ultra-fast inference speed.' },
];

const surfaces = [
  {
    icon: Terminal,
    label: 'DETAIL A',
    name: 'CLI',
    tagline: 'The system engine.',
    points: ['Initialize hub storage', 'Manage assets', 'Validate structure', 'Connect editors', 'Run the local hub server'],
  },
  {
    icon: LayoutDashboard,
    label: 'DETAIL B',
    name: 'Hub Dashboard',
    tagline: 'The visual control plane.',
    points: ['Show system health', 'Guide setup', 'Browse assets', 'Inspect integrations', 'Run high-confidence actions'],
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <TitleblockBar />

      {/* Hero */}
      <section className="relative">
        <SheetMarks />
        <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-display font-bold text-6xl md:text-7xl leading-[0.95] uppercase text-foreground mb-6">
              One hub.
              <br />
              Every editor.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md mb-8">
              You're juggling Cursor, Claude Code, Windsurf, and Zed — copy-pasting the same
              rules, prompts, and skills into each one, with no way to tell which copy is
              current. Chain Hub keeps one editable version on disk as the single source of
              truth, synced out to every editor you use.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="View on GitHub — opens in a new tab"
                className="px-6 py-3 rounded-sm bg-primary hover:opacity-90 text-primary-foreground font-medium transition-opacity text-center inline-flex items-center justify-center gap-2"
              >
                <GithubIcon size={18} />
                View on GitHub
              </a>
              <a
                href="#proof"
                className="px-6 py-3 rounded-sm border border-border text-foreground hover:border-ring transition-colors text-center"
              >
                See the dashboard
              </a>
            </div>
            <p className="text-sm text-muted-foreground mb-10">
              Free &amp; open source — nothing leaves your machine.
            </p>
            <div className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase border-t border-border pt-4 flex flex-wrap gap-x-6 gap-y-1">
              <span>Sheet 1/1</span>
              <span>Local-first</span>
              <span>Scale 1:1</span>
              <span>Chain Hub</span>
            </div>
          </div>
          <div>
            <HubSchematic />
            <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase mt-4 text-center">
              Two editors, two copies to sync by hand. Four editors, four. One hub — still one.
            </p>
          </div>
        </div>
      </section>

      {/* Asset legend */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-b border-border">
        <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
          Legend — one source of truth, five asset kinds
        </h2>
        <div className="bp-corners border border-border rounded-sm divide-y divide-border">
          {assets.map(({ icon: Icon, name, description }, i) => (
            <div key={name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-5 py-4">
              <div className="flex items-center gap-3 sm:w-56 shrink-0">
                <span className="font-mono text-[10px] text-muted-foreground tracking-widest w-12 shrink-0">
                  REF {String(i + 1).padStart(2, '0')}
                </span>
                <Icon size={18} className="text-primary shrink-0" />
                <h3 className="font-display font-semibold text-base uppercase tracking-wide text-foreground">
                  {name}
                </h3>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed max-w-prose">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two surfaces */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-b border-border">
        <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
          Two surfaces, one hub folder
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {surfaces.map(({ icon: Icon, label, name, tagline, points }) => (
            <div key={name} className="bp-corners p-6 border border-border rounded-sm text-left">
              <div className="flex items-center justify-between mb-4">
                <Icon size={22} className="text-primary" />
                <span className="font-mono text-[10px] text-muted-foreground tracking-widest">{label}</span>
              </div>
              <h3 className="font-display font-semibold text-2xl uppercase tracking-wide text-foreground mb-1">
                {name}
              </h3>
              <p className="text-base text-muted-foreground mb-4">{tagline}</p>
              <ul className="space-y-2">
                {points.map((point) => (
                  <li key={point} className="text-base text-muted-foreground flex items-start gap-2 font-mono">
                    <span className="text-primary">&gt;</span>
                    <span className="font-sans">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* AI providers */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-b border-border">
        <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
          Optional — bring your own LLM
        </h2>
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-primary" />
              <h3 className="font-display font-semibold text-2xl uppercase tracking-wide text-foreground">
                Draft it, improve it, don't retype it
              </h3>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed max-w-md">
              Connect a model under Settings → AI and the Library can turn a plain-language
              description into a complete skill, agent, workflow, rule, or prompt — then audit any
              existing asset against best practices for its kind and rewrite it to fix what it
              finds. Nothing else in Chain Hub needs this; every other feature works with zero AI
              configured.
            </p>
          </div>
          <div className="bp-corners border border-border rounded-sm divide-y divide-border">
            {aiProviders.map(({ icon: Icon, name, description }, i) => (
              <div key={name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-5 py-4">
                <div className="flex items-center gap-3 sm:w-40 shrink-0">
                  <span className="font-mono text-[10px] text-muted-foreground tracking-widest w-12 shrink-0">
                    REF {String(i + 1).padStart(2, '0')}
                  </span>
                  <Icon size={18} className="text-primary shrink-0" />
                  <h4 className="font-display font-semibold text-base uppercase tracking-wide text-foreground">
                    {name}
                  </h4>
                </div>
                <p className="text-base text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DashboardProof />

      {/* CTA */}
      <section className="relative">
        <SheetMarks />
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display font-bold text-4xl md:text-5xl uppercase text-foreground mb-4">
            Ready when you are.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Chain Hub is free and open source. Clone it, read the code, or follow along as it
            ships.
          </p>
          <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            <span>01 Clone the repo</span>
            <span>02 chain init</span>
            <span>03 chain setup</span>
          </div>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="View on GitHub — opens in a new tab"
            className="px-6 py-3 rounded-sm bg-primary hover:opacity-90 text-primary-foreground font-medium transition-opacity inline-flex items-center justify-center gap-2"
          >
            <GithubIcon size={18} />
            View on GitHub
          </a>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
          Made with
          <Heart className="size-3.5 fill-primary text-primary" aria-label="love" />
          by{' '}
          <a
            href="https://martijnbokma.nl"
            target="_blank"
            rel="noreferrer"
            aria-label="Martijn Bokma — opens in a new tab"
            className="inline-block -my-3 py-3 hover:text-foreground transition-colors"
          >
            Martijn Bokma <span aria-hidden="true">↗</span>
          </a>
        </p>
        <div className="flex items-center gap-8 text-sm text-muted-foreground">
          <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub — opens in a new tab" className="inline-block -my-3 py-3 hover:text-foreground transition-colors">GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </footer>
    </div>
  );
}
