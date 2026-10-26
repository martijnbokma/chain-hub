import {
  Terminal,
  LayoutDashboard,
} from 'lucide-react';
import { GithubIcon, LogoLockup, LogoMark, TitleblockBar } from '../components/PageChrome';
import { Reveal } from '../components/Reveal';
import {
  AgentsIcon,
  EditorsIcon,
  PromptsIcon,
  RulesIcon,
  SkillsIcon,
  WorkflowsIcon,
} from './landing/AssetIcons';
import { DashboardProof } from './landing/DashboardProof';
import { HubSchematic } from './landing/HubSchematic';
import { CopyCommand } from './landing/CopyCommand';
import { SectionHead } from './landing/SectionHead';
import { SignalPeriod } from './landing/SignalPeriod';
import { BAND_VARS } from './landing/bandVars';

const REPO_URL = 'https://github.com/martijnbokma/chain-hub';

const editors = ['Claude Code', 'Cursor', 'Devin CLI', 'Windsurf', 'Zed', 'Antigravity'];

const drift = [
  { editor: 'Claude Code', status: 'CLAUDE.md · v1' },
  { editor: 'Cursor', status: '.cursor/rules · v3' },
  { editor: 'Devin CLI', status: '.devin/rules · missing' },
  { editor: 'Windsurf', status: '.windsurf/rules · v2 ?' },
  { editor: 'Zed', status: '.rules · missing' },
  { editor: 'Antigravity', status: 'AGENTS.md · missing' },
];

const assets = [
  { icon: SkillsIcon, name: 'Skills', description: 'Reusable abilities your AI can call on when it needs them.', ref: 'skills/' },
  { icon: AgentsIcon, name: 'Agents', description: 'Saved roles and personalities for specific kinds of work.', ref: 'agents/' },
  { icon: WorkflowsIcon, name: 'Workflows', description: 'Multi-step processes you write down once and reuse everywhere.', ref: 'workflows/' },
  { icon: RulesIcon, name: 'Rules', description: 'Standing instructions your AI always follows.', ref: 'rules/' },
  { icon: PromptsIcon, name: 'Prompts', description: 'A reusable prompt for one specific task.', ref: 'prompts/' },
  { icon: EditorsIcon, name: 'Editor connections', description: 'The links that put the same files into every editor you use.', ref: 'chain setup' },
];

const steps = [
  {
    label: 'Install',
    title: 'Install the CLI',
    description: 'Chain Hub is free and open source, published on npm. Node.js 22.13 or newer is all you need.',
    command: 'npm install -g chain-hub',
  },
  {
    label: 'Start',
    title: 'Start your hub',
    description: 'Creates the hub folder on first run and opens the dashboard. From now on, this is where everything lives.',
    command: 'chain hub',
  },
  {
    label: 'Connect',
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
      <section className="relative border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-foreground mb-5">
              Free · open source · local-first
            </p>
            <h1 className="font-display font-semibold text-[clamp(2.75rem,6vw,4.5rem)] leading-[1.02] tracking-[-0.04em] text-balance text-foreground mb-6">
              One hub.
              <br />
              Every editor<SignalPeriod />
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed text-pretty max-w-md mb-8">
              Using more than one AI editor means keeping the same skills, rules, and prompts in
              sync by hand, and losing track of which copy is current. Chain Hub keeps them in{' '}
              <b className="font-semibold text-foreground">one folder on your computer</b> and
              links them into{' '}
              <b className="font-semibold text-foreground">
                Cursor, Claude Code, Windsurf, Zed, Antigravity, and Devin
              </b>
              . Edit once. Every editor follows.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Get Chain Hub on GitHub, opens in a new tab"
                className="px-6 py-3 bg-foreground border-[1.5px] border-foreground dark:bg-primary dark:border-primary dark:text-primary-foreground hover:opacity-90 text-background font-medium transition-opacity text-center inline-flex items-center justify-center gap-2"
              >
                <GithubIcon size={18} />
                Get it on GitHub
              </a>
              <a
                href="#how"
                className="px-6 py-3 border-[1.5px] border-frame text-foreground hover:border-ring transition-colors text-center inline-flex items-center justify-center gap-2"
              >
                See how it works
              </a>
            </div>
            <p className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              Free and open source. Nothing leaves your computer.
            </p>
          </div>
          <div>
            <HubSchematic />
          </div>
        </div>
      </section>

      {/* The problem */}
      <section id="why" className="scroll-mt-20 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <SectionHead
            index="01"
            kicker="The problem"
            title="Six editors. Six copies"
            copy="Every AI editor wants its own rules file, its own prompts and its own skills folder. So you copy the same things into each one, and after a week nobody knows which version is current."
          />
          <Reveal className="grid lg:grid-cols-2 gap-5">
            <div className="border-[1.5px] border-frame bg-card p-6" data-ui>
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">Without Chain Hub</span>
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">Copy · paste · drift</span>
              </div>
              <h3 className="font-display font-semibold text-2xl tracking-[-0.02em] text-balance text-foreground mb-5">
                The same rules, scattered.
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {drift.map(({ editor, status }) => (
                  <div
                    key={editor}
                    className="flex flex-col gap-0.5 border border-border rounded-sm px-3 py-2 font-mono"
                  >
                    <span className="text-[13px] text-foreground font-medium">{editor}</span>
                    <span className="text-[11px] text-muted-foreground">{status}</span>
                  </div>
                ))}
              </div>
              <p className="text-base text-foreground leading-relaxed text-pretty mt-5">
                Change something in one place and the others fall behind. After a week nobody knows
                which version is the right one.
              </p>
            </div>
            <div className="bp-corners border-[1.5px] border-frame bg-band p-6" style={BAND_VARS} data-ui>
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">With Chain Hub</span>
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">One source of truth</span>
              </div>
              <h3 className="font-display font-semibold text-2xl tracking-[-0.02em] text-balance text-foreground mb-5">
                One folder. Linked everywhere.
              </h3>
              <div className="flex items-center gap-4 font-mono text-[13px] text-foreground">
                <LogoMark className="size-14 shrink-0" />
                <span>
                  ~/.chain-hub
                  <br />
                  <span className="text-muted-foreground">
                    skills · agents · workflows · rules · prompts
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                {editors.map((editor) => (
                  <div
                    key={editor}
                    className="border border-border px-2 py-2 font-mono text-[12px] text-muted-foreground text-center"
                  >
                    <span className="block size-1.5 rounded-full bg-primary mx-auto mb-1.5" aria-hidden="true" />
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
          <p className="text-sm text-muted-foreground mt-4 max-w-prose">
            Already have rules files scattered across your editors? Chain Hub wraps, not replaces:
            <code className="font-mono text-[0.9em]"> chain asset discover</code> finds them and
            imports them into the hub, then your editors keep working on the same files.
          </p>
        </div>
      </section>

      {/* What it holds */}
      <section id="what" className="scroll-mt-20 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <SectionHead
            index="02"
            kicker="What it holds"
            title="Everything your editor needs"
            copy="Five kinds of assets, all plain Markdown files you own. Plus the connections that link them into each editor."
          />
          <Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border-[1.5px] border-frame">
              {assets.map(({ icon: Icon, name, description, ref }, i) => (
                <div key={name} className="bg-card p-6 transition-colors hover:bg-secondary">
                  <div className="flex items-start justify-between mb-5">
                    <Icon size={30} className="text-foreground" />
                    <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">
                      Ref {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-xl tracking-[-0.015em] text-foreground mb-1.5">
                    {name}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed text-pretty">
                    {description}
                  </p>
                  <code className="block font-mono text-[13px] text-muted-foreground mt-4">
                    {ref}
                  </code>
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
      <section id="how" className="scroll-mt-20 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <SectionHead
            index="03"
            kicker="How it works"
            title="Three steps"
            copy="Install the CLI, start the hub, connect your editors. After that you only ever edit files in one place."
          />
          <Reveal className="grid md:grid-cols-3 gap-5">
            {steps.map(({ label, title, description, command }, i) => (
              <div key={title} className="min-w-0 border-[1.5px] border-frame bg-card flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-mono text-[13px] font-semibold text-primary">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">
                    {label}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-display font-semibold text-xl tracking-[-0.015em] text-balance text-foreground mb-1">
                    {title}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed text-pretty mb-5 flex-1">
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
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <SectionHead
            index="04"
            kicker="Two ways to use it"
            title="Terminal or dashboard"
            copy="Both work on the same hub folder. Use the command line when you're in flow, and the dashboard when you want to see everything at a glance."
          />
          <Reveal className="grid lg:grid-cols-2 gap-5">
            <div className="min-w-0 border-[1.5px] border-frame bg-card flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">Detail A</span>
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">The engine</span>
              </div>
              <div className="bg-band font-mono text-[13px] leading-[1.85] text-foreground px-5 py-4 min-h-40 whitespace-nowrap overflow-x-auto" style={BAND_VARS} data-ui>
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
            <div className="min-w-0 border-[1.5px] border-frame bg-card flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">Detail B</span>
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">The control panel</span>
              </div>
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
                  <div className="col-span-3 bg-card border border-border px-2.5 py-2 font-mono text-[11px] flex justify-between gap-2">
                    <span className="min-w-0 truncate text-foreground">System health</span>
                    <span className="shrink-0 text-muted-foreground">all good</span>
                  </div>
                  <div className="col-span-3 bg-card border border-border px-2.5 py-2 font-mono text-[11px] flex justify-between gap-2">
                    <span className="min-w-0 truncate text-foreground">skills/agent-browser.md</span>
                    <span className="shrink-0 text-muted-foreground">linked · 6</span>
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
      <section className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
          <SectionHead
            index="05"
            kicker="Learnings & sync"
            title="It remembers, and it syncs"
            copy="Two quiet features make the hub worth more over time: it keeps what it learns, and it follows you between machines."
          />
          <Reveal className="grid lg:grid-cols-2 gap-6">
            <div className="border-[1.5px] border-frame rounded-sm bg-card overflow-hidden">
              <div className="bg-band font-mono text-[13px] leading-[1.85] text-foreground px-5 py-4 whitespace-nowrap overflow-x-auto" style={BAND_VARS} data-ui>
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
              <div className="bg-band font-mono text-[13px] leading-[1.85] text-foreground px-5 py-4 whitespace-nowrap overflow-x-auto" style={BAND_VARS} data-ui>
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
            index="06"
            kicker="Optional"
            title="Bring your own model"
            copy="Optional, and off by default. Add your own AI model in Settings and Chain Hub can draft a complete skill, agent, workflow, rule or prompt from a short description, or check and improve one you already have."
          />
          <Reveal className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {aiProviders.map(({ name, description, local }) => (
              <div
                key={name}
                className={`border p-5 ${local ? 'border-primary' : 'border-border'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <b className="font-display font-semibold text-lg text-foreground">{name}</b>
                  {local && (
                    <em className="not-italic font-mono text-[10px] tracking-[0.08em] uppercase bg-primary text-primary-foreground px-1.5 py-0.5">
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
            Ready when you&nbsp;are<SignalPeriod />
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
              className="px-6 py-3 bg-foreground border-[1.5px] border-foreground dark:bg-primary dark:border-primary dark:text-primary-foreground hover:opacity-90 text-background font-medium transition-opacity inline-flex items-center justify-center gap-2"
            >
              <GithubIcon size={18} />
              View on GitHub
            </a>
            <a
              href="#how"
              className="px-6 py-3 border-[1.5px] border-frame text-foreground hover:border-ring transition-colors inline-flex items-center justify-center"
            >
              How it works
            </a>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 pt-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] flex flex-col sm:flex-row items-center justify-between gap-4">
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
        </div>
      </footer>
    </div>
  );
}
