import {
  BookOpen,
  Bot,
  Workflow,
  ScrollText,
  FileText,
  Link2,
  Terminal,
  LayoutDashboard,
} from 'lucide-react';
import { GithubIcon, LogoLockup, LogoMark, TitleblockBar } from '../components/PageChrome';
import { Reveal } from '../components/Reveal';
import { DashboardProof } from './landing/DashboardProof';
import { HubSchematic } from './landing/HubSchematic';
import { CopyCommand } from './landing/CopyCommand';
import { SectionHead } from './landing/SectionHead';
import { BAND_VARS } from './landing/bandVars';

const REPO_URL = 'https://github.com/martijnbokma/chain-hub';

const editors = ['Claude Code', 'Cursor', 'Devin CLI', 'Windsurf', 'Zed', 'Antigravity'];

const drift = [
  { editor: 'Claude Code', status: 'rules · v1' },
  { editor: 'Cursor', status: 'rules · v3' },
  { editor: 'Devin CLI', status: 'missing' },
  { editor: 'Windsurf', status: 'rules · v2 ?' },
  { editor: 'Zed', status: 'missing' },
  { editor: 'Antigravity', status: 'missing' },
];

const assets = [
  { icon: BookOpen, name: 'Skills', description: 'Reusable abilities your AI can call on when it needs them.' },
  { icon: Bot, name: 'Agents', description: 'Saved roles and personalities for specific kinds of work.' },
  { icon: Workflow, name: 'Workflows', description: 'Multi-step processes you write down once and reuse everywhere.' },
  { icon: ScrollText, name: 'Rules', description: 'Standing instructions your AI always follows.' },
  { icon: FileText, name: 'Prompts', description: 'A reusable prompt for one specific task.' },
  { icon: Link2, name: 'Editor connections', description: 'The links that put the same files into every editor you use.' },
];

const steps = [
  {
    title: 'Install the CLI',
    description: 'Chain Hub is free and open source, published on npm. Node.js 22.13 or newer is all you need.',
    command: 'npm install -g chain-hub',
  },
  {
    title: 'Start your hub',
    description: 'Creates the hub folder on first run and opens the dashboard. From now on, this is where everything lives.',
    command: 'chain hub',
  },
  {
    title: 'Connect your editors',
    description: 'Links the hub into each editor you use. From now on they all read the same files.',
    command: 'chain setup',
  },
];

const aiProviders: { name: string; description: string; local?: boolean }[] = [
  { name: 'Ollama', description: 'Runs on your machine. No API key, nothing leaves your computer.', local: true },
  { name: 'Anthropic', description: 'Claude models with your own API key.' },
  { name: 'OpenAI', description: 'GPT models with your own API key.' },
  { name: 'Mistral', description: 'Mistral models with your own API key.' },
  { name: 'Gemini', description: 'Gemini models with your own API key.' },
  { name: 'Groq', description: 'Fast inference for open models.' },
  { name: 'OpenRouter', description: 'One key, any open or proprietary model.' },
  { name: 'DeepSeek', description: 'DeepSeek models with your own API key.' },
  { name: 'Cerebras', description: 'Ultra-fast inference speed.' },
];

const cliPoints = [
  'Initialise and validate hub storage (init · status · validate)',
  'Manage the five asset kinds (asset list · create · update · remove)',
  'Import files already living in your editors (asset discover · import)',
  'Install, fork and check updates for skills (skill install · fork · check-updates)',
  'Browse the curated catalog (catalog list · install · refresh)',
  'Capture learnings and distill them into skills (capture · reflect)',
  'Connect editors and serve the dashboard (setup · hub)',
];

const dashboardPoints = [
  'System health and editor drift on Overview',
  'Browse the Library, filtered by editable vs upstream ownership',
  'Install curated assets from the Catalog',
  'Review captured learnings on the Learnings page',
  'Inspect editor connections under Integrations',
  'Draft, audit and improve assets with your own model',
];

const dashNav = ['Overview', 'Library', 'Catalog', 'Learnings', 'Integrations', 'Settings'];
const dashStats = [
  { value: '24', label: 'Skills' },
  { value: '6', label: 'Agents' },
  { value: '6', label: 'Editors' },
];

export function LandingPage() {
  return (
    <div className="min-h-dvh">
      <TitleblockBar />

      {/* Hero */}
      <section className="relative">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="font-display font-semibold text-6xl md:text-7xl leading-[1.02] tracking-[-0.04em] text-balance text-foreground mb-6">
              One hub.
              <br />
              Every editor<span className="text-primary">.</span>
            </h1>
            <p className="text-lg text-foreground leading-relaxed text-pretty max-w-md mb-8">
              Using more than one AI editor means keeping the same skills, rules, and prompts in
              sync by hand, and losing track of which copy is current. Chain Hub keeps them in
              one folder on your computer and links them into Cursor, Claude Code, Windsurf, Zed,
              Antigravity, and Devin. Edit once. Every editor follows.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Get Chain Hub on GitHub, opens in a new tab"
                className="px-6 py-3 rounded-sm bg-primary hover:opacity-90 hover:-translate-y-0.5 text-primary-foreground font-medium transition-[transform,opacity] text-center inline-flex items-center justify-center gap-2"
              >
                <GithubIcon size={18} />
                Get it on GitHub
              </a>
              <a
                href="#how"
                className="px-6 py-3 rounded-sm border-[1.5px] border-frame text-foreground hover:-translate-y-0.5 transition-transform text-center inline-flex items-center justify-center gap-2"
              >
                See how it works
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Free and open source. Nothing leaves your computer.
            </p>
          </div>
          <div>
            <HubSchematic />
          </div>
        </div>
      </section>

      {/* The problem */}
      <section id="why" className="scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <SectionHead
            title="Six editors. Six copies"
            copy="Every AI editor wants its own rules file, its own prompts and its own skills folder. So you copy the same things into each one, and after a week nobody knows which version is current."
          />
          <Reveal className="grid lg:grid-cols-2 gap-5">
            <div className="border-[1.5px] border-frame bg-card p-6" data-ui>
              <h3 className="font-display font-semibold text-2xl tracking-[-0.02em] text-balance text-foreground mb-5">
                The same rules, scattered.
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {drift.map(({ editor, status }) => (
                  <div
                    key={editor}
                    className="flex items-center justify-between gap-2 bg-secondary rounded-sm px-3 py-2 font-mono text-[13px]"
                  >
                    <span className="text-foreground font-medium">{editor}</span>
                    <span className="text-muted-foreground">{status}</span>
                  </div>
                ))}
              </div>
              <p className="text-base text-foreground leading-relaxed text-pretty mt-5">
                Change something in one place and the others fall behind. After a week nobody knows
                which version is the right one.
              </p>
            </div>
            <div className="bp-corners border-[1.5px] border-frame bg-band p-6" style={BAND_VARS} data-ui>
              <h3 className="font-display font-semibold text-2xl tracking-[-0.02em] text-balance text-foreground mb-5">
                One folder. Linked everywhere.
              </h3>
              <p className="font-mono text-[13px] text-foreground">
                ~/.chain-hub
                <br />
                <span className="text-muted-foreground">
                  skills · agents · workflows · rules · prompts
                </span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                {editors.map((editor) => (
                  <div
                    key={editor}
                    className="bg-card rounded-sm px-3 py-2 font-mono text-[12px] text-muted-foreground text-center"
                  >
                    {editor}
                  </div>
                ))}
              </div>
              <p className="text-base text-foreground leading-relaxed text-pretty mt-5">
                You edit the file in the hub. Every connected editor reads that same file: two
                editors or six, still one copy.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* What it holds */}
      <section id="what" className="scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <SectionHead
            title="Everything your editor needs"
            copy="Five kinds of assets, all plain Markdown files you own. Plus the connections that link them into each editor."
          />
          <Reveal>
            <div className="border-[1.5px] border-frame bg-card divide-y divide-border">
              {assets.map(({ icon: Icon, name, description }) => (
                <div key={name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-5 py-4">
                  <div className="flex items-center gap-3 sm:w-56 shrink-0">
                    <Icon size={18} className="text-foreground shrink-0" />
                    <h3 className="font-display font-semibold text-base text-foreground">
                      {name}
                    </h3>
                  </div>
                  <p className="text-base text-foreground leading-relaxed text-pretty max-w-prose">{description}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Your hub also keeps <code className="font-mono text-[0.9em]">~/.chain-hub/memory</code>:
              lessons your AI picked up, folded back into better skills.
            </p>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <SectionHead
            title="Three steps"
            copy="Install the CLI, start the hub, connect your editors. After that you only ever edit files in one place."
          />
          <Reveal className="grid md:grid-cols-3 gap-10 md:gap-8">
            {steps.map(({ title, description, command }) => (
              <div key={title} className="flex flex-col">
                <div className="flex flex-col flex-1">
                  <h3 className="font-display font-semibold text-xl tracking-[-0.015em] text-balance text-foreground mb-1">
                    {title}
                  </h3>
                  <p className="text-base text-foreground leading-relaxed text-pretty mb-5 flex-1">
                    {description}
                  </p>
                  <CopyCommand command={command} />
                </div>
              </div>
            ))}
          </Reveal>
          <p className="text-sm text-muted-foreground mt-4">
            Or clone the repo and run <code className="font-mono text-[0.9em]">bun run hub</code> if
            you want to develop on Chain Hub itself.
          </p>
        </div>
      </section>

      {/* Two ways to use it */}
      <section>
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <SectionHead
            title="Terminal or dashboard"
            copy="Both work on the same hub folder. Use the command line when you're in flow, and the dashboard when you want to see everything at a glance."
          />
          <Reveal className="grid sm:grid-cols-2 gap-5">
            <div className="border-[1.5px] border-frame bg-card flex flex-col">
              <div className="bg-band font-mono text-[13px] leading-[1.85] text-foreground px-5 py-4 min-h-40" style={BAND_VARS} data-ui>
                <span className="text-primary">~ $</span> chain init<br />
                <span className="text-primary">✓</span> Hub created<br />
                <span className="text-primary">~ $</span> chain setup<br />
                <span className="text-primary">●</span> Claude Code · Cursor · Devin · Windsurf · Zed · Antigravity<br />
                <span className="text-primary">✓</span> 6 editors connected<br />
                <span className="text-muted-foreground"># edit once, every editor follows</span>
              </div>
              <div className="p-6 flex-1">
                <div className="flex items-center gap-2.5 mb-1">
                  <Terminal size={18} className="text-foreground" />
                  <h3 className="font-display font-semibold text-2xl uppercase tracking-wider text-foreground">CLI</h3>
                </div>
                <p className="text-base text-muted-foreground mb-4">The system engine.</p>
                <ul className="space-y-2">
                  {cliPoints.map((point) => (
                    <li key={point} className="text-base text-foreground flex items-start gap-2">
                      <span className="text-muted-foreground">&gt;</span>
                      <span className="font-sans">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="border-[1.5px] border-frame bg-card flex flex-col">
              <div className="bg-secondary p-3 min-h-40 grid grid-cols-[112px_minmax(0,1fr)] gap-2.5" data-ui>
                <div className="bg-card border border-border p-2.5 grid gap-1.5 content-start font-mono text-[10px] text-muted-foreground">
                  {dashNav.map((item, i) => (
                    <span key={item} className={i === 0 ? 'text-foreground font-semibold' : undefined}>
                      {i === 0 && <span aria-hidden="true">● </span>}
                      {item}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 content-start">
                  {dashStats.map(({ value, label }) => (
                    <div key={label} className="bg-card border border-border p-2.5">
                      <b className="block font-display text-2xl tracking-[-0.02em] tabular-nums text-foreground">{value}</b>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{label}</span>
                    </div>
                  ))}
                  <div className="col-span-3 bg-card border border-border px-2.5 py-2 font-mono text-[11px] flex justify-between">
                    <span className="text-foreground">System health</span>
                    <span className="text-muted-foreground">all good</span>
                  </div>
                  <div className="col-span-3 bg-card border border-border px-2.5 py-2 font-mono text-[11px] flex justify-between">
                    <span className="text-foreground">skills/agent-browser.md</span>
                    <span className="text-muted-foreground">linked · 6</span>
                  </div>
                </div>
              </div>
              <div className="p-6 flex-1">
                <div className="flex items-center gap-2.5 mb-1">
                  <LayoutDashboard size={18} className="text-foreground" />
                  <h3 className="font-display font-semibold text-2xl uppercase tracking-wider text-foreground">Hub Dashboard</h3>
                </div>
                <p className="text-base text-muted-foreground mb-4">The visual control plane.</p>
                <ul className="space-y-2">
                  {dashboardPoints.map((point) => (
                    <li key={point} className="text-base text-foreground flex items-start gap-2">
                      <span className="text-muted-foreground">&gt;</span>
                      <span className="font-sans">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
          <p className="text-sm text-muted-foreground mt-4">
            The numbers in the mock above are an example, not real data.
          </p>
        </div>
      </section>

      {/* Learns and syncs */}
      <section>
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <Reveal>
            <SectionHead
              title="It remembers, and it syncs"
              copy="Two quiet features make the hub worth more over time: it keeps what it learns, and it follows you between machines."
            />
          </Reveal>
          <Reveal className="grid lg:grid-cols-2 gap-6">
            <div className="border-[1.5px] border-frame rounded-sm bg-card overflow-hidden">
              <div className="bg-band font-mono text-[13px] leading-[1.85] text-foreground px-5 py-4" style={BAND_VARS} data-ui>
                <p><span className="text-primary">~ $</span> chain capture --event correction --skill commits \</p>
                <p className="pl-6 opacity-70">--summary "never amend a published commit"</p>
                <p><span className="text-primary">✓</span> Captured for commits</p>
                <p><span className="text-primary">~ $</span> chain resolve commits</p>
                <p><span className="text-primary">✓</span> Lessons marked addressed</p>
              </div>
              <div className="px-5 py-5">
                <h3 className="font-display font-semibold text-2xl tracking-[-0.02em] text-balance text-foreground mb-2">
                  It learns from what went wrong
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed text-pretty">
                  Your agent amended a published commit again? Capture the correction once. The
                  next audit of that skill folds the lesson in, and the Learnings page in the
                  dashboard shows the full timeline and every reflection.
                </p>
                <a
                  href="/docs/learnings"
                  className="mt-4 inline-block text-sm font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
                >
                  Read about learnings
                </a>
              </div>
            </div>
            <div className="border-[1.5px] border-frame rounded-sm bg-card overflow-hidden">
              <div className="bg-band font-mono text-[13px] leading-[1.85] text-foreground px-5 py-4" style={BAND_VARS} data-ui>
                <p><span className="text-primary">~ $</span> chain sync</p>
                <p><span className="text-primary">●</span> Connected: private repo chain-hub-sync</p>
                <p><span className="text-primary">~ $</span> chain sync status</p>
                <p><span className="text-primary">✓</span> In sync: 138 assets backed up</p>
              </div>
              <div className="px-5 py-5">
                <h3 className="font-display font-semibold text-2xl tracking-[-0.02em] text-balance text-foreground mb-2">
                  Your hub on every machine
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed text-pretty">
                  Point chain sync at a private GitHub repo and your whole hub is versioned and
                  backed up. It syncs when the dashboard starts. Edit on your laptop, continue on
                  your desktop. A bad edit? The full history is in the repo, and merge conflicts
                  resolve in the dashboard, not the terminal.
                </p>
                <a
                  href="/docs/backup-sync"
                  className="mt-4 inline-block text-sm font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
                >
                  Read about backup and sync
                </a>
              </div>
              <div className="bg-secondary px-5 py-3" aria-hidden="true">
                <svg viewBox="0 0 420 52" className="w-full h-12 text-muted-foreground">
                  <path className="bp-flow" d="M64 26 C110 26 140 26 186 26" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path className="bp-flow" d="M234 26 C280 26 290 14 340 14" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path className="bp-flow" d="M234 26 C280 26 290 38 340 38" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="40" cy="26" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="40" cy="26" r="4" className="fill-primary text-primary" />
                  <text x="40" y="48" textAnchor="middle" fontSize="8" letterSpacing="0.5" fill="currentColor" className="font-mono">~/.chain-hub</text>
                  <rect x="186" y="12" width="48" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="196" cy="26" r="3" className="fill-primary text-primary" />
                  <text x="216" y="30" textAnchor="middle" fontSize="8" fill="currentColor" className="font-mono">repo</text>
                  <circle cx="352" cy="14" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="352" cy="38" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <text x="352" y="8" textAnchor="middle" fontSize="8" fill="currentColor" className="font-mono">laptop</text>
                  <text x="352" y="50" textAnchor="middle" fontSize="8" fill="currentColor" className="font-mono">desktop</text>
                </svg>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Optional: bring your own model (always-ink band) */}
      <section className="bg-band text-band-ink" style={BAND_VARS}>
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <SectionHead
            title="Bring your own model"
            copy="Optional, and off by default. Add your own AI model in Settings and Chain Hub can draft a complete skill, agent, workflow, rule or prompt from a short description, or check and improve one you already have."
          />
          <Reveal className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {aiProviders.map(({ name, description, local }) => (
              <div key={name} className="bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <b className="font-display font-semibold text-lg text-foreground">{name}</b>
                  {local && (
                    <em className="not-italic text-xs font-medium bg-foreground text-band px-1.5 py-0.5">
                      Local
                    </em>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty mt-1.5">{description}</p>
              </div>
            ))}
          </Reveal>
          <p className="text-sm text-muted-foreground mt-5">
            Your API keys stay on your machine. There is no Chain cloud, and everything else works
            without AI.
          </p>
        </div>
      </section>

      <DashboardProof />

      {/* CTA */}
      <section className="relative">
        <Reveal className="max-w-3xl mx-auto px-6 py-24 lg:py-32 text-center">
          <LogoMark className="size-20 mx-auto mb-5 text-foreground" />
          <h2 className="font-display font-semibold text-4xl md:text-6xl leading-[1.08] tracking-[-0.03em] text-balance text-foreground mb-5">
            Ready when you are<span className="text-primary">.</span>
          </h2>
          <p className="text-lg text-foreground mb-8 max-w-md mx-auto leading-relaxed text-pretty">
            Chain Hub is free and open source. One install, three commands, and every
            editor reads the same files.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="View on GitHub, opens in a new tab"
              className="px-6 py-3 rounded-sm bg-primary hover:opacity-90 hover:-translate-y-0.5 text-primary-foreground font-medium transition-[transform,opacity] inline-flex items-center justify-center gap-2"
            >
              <GithubIcon size={18} />
              View on GitHub
            </a>
            <a
              href="#how"
              className="px-6 py-3 rounded-sm border-[1.5px] border-frame text-foreground hover:-translate-y-0.5 transition-transform inline-flex items-center justify-center"
            >
              How it works
            </a>
          </div>
        </Reveal>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-foreground">
          <LogoLockup className="h-5 w-auto" />
        </div>
        <p className="text-sm text-muted-foreground">
          Built by{' '}
          <a
            href="https://martijnbokma.nl"
            target="_blank"
            rel="noreferrer"
            aria-label="Martijn Bokma, opens in a new tab"
            className="underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
          >
            Martijn Bokma <span aria-hidden="true">↗</span>
          </a>
        </p>
        <div className="flex items-center gap-8 text-sm text-muted-foreground">
          <a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub, opens in a new tab" className="inline-block -my-3 py-3 hover:text-foreground transition-colors">GitHub <span aria-hidden="true">↗</span></a>
        </div>
      </footer>
    </div>
  );
}
