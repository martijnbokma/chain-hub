import React from 'react';
import {
  BookOpen,
  Bot,
  Workflow,
  ScrollText,
  Brain,
  Heart,
  Link2,
  Terminal,
  LayoutDashboard,
} from 'lucide-react';
import dashboardOverview from '../assets/dashboard-overview.webp';
import dashboardLibrary from '../assets/dashboard-library.webp';

const EDITORS = ['Cursor', 'Claude Code', 'Windsurf', 'Zed'];
const REPO_URL = 'https://github.com/martijnbokma/chain-hub';

const assets = [
  { icon: BookOpen, name: 'Skills', description: 'Reusable capabilities your editor can invoke on demand.' },
  { icon: Bot, name: 'Agents', description: 'Personas and behavior presets tuned for specific work.' },
  { icon: Workflow, name: 'Workflows', description: 'Multi-step processes captured once, run everywhere.' },
  { icon: ScrollText, name: 'Rules', description: 'Guardrails and conventions your AI tools always follow.' },
  { icon: Brain, name: 'Memory', description: 'Notes and learnings that carry context across sessions.' },
  { icon: Link2, name: 'Editor connections', description: 'One source of truth, linked into every editor you use.' },
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

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.02 1.76 2.68 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a10.98 10.98 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.64 1.59.24 2.77.12 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.41-5.27 5.69.42.36.78 1.07.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .3.2.66.79.55A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function TitleblockBar() {
  return (
    <header className="max-w-6xl mx-auto px-6 pt-6 flex items-center border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm border border-primary flex items-center justify-center font-mono text-xs text-primary">
          CH
        </div>
        <span className="font-display font-semibold text-xl tracking-wide text-foreground uppercase">
          Chain Hub
        </span>
      </div>
    </header>
  );
}

function HubSchematic() {
  const editorY = [40, 146, 252, 358];
  const busX = 340;
  const hubMidY = 234;
  return (
    <svg
      viewBox="0 0 640 440"
      className="w-full h-auto max-w-lg mx-auto"
      role="img"
      aria-label="Diagram: one Chain Hub connecting to Cursor, Claude Code, Windsurf, and Zed"
    >
      {/* trunk + bus */}
      <path
        className="bp-line"
        d={`M180,${hubMidY} H${busX} M${busX},${editorY[0] + 28} V${editorY[3] + 28}`}
        stroke="var(--primary)"
        strokeWidth="2"
        fill="none"
        strokeDasharray={500}
        strokeDashoffset={500}
        style={{ animationDelay: '0ms' }}
      />
      {editorY.map((y, i) => (
        <g key={i}>
          <path
            className="bp-line"
            d={`M${busX},${y + 28} H480`}
            stroke="var(--primary)"
            strokeWidth="2"
            fill="none"
            strokeDasharray={150}
            strokeDashoffset={150}
            style={{ animationDelay: `${400 + i * 100}ms` }}
          />
          <circle cx={busX} cy={y + 28} r="3" fill="var(--primary)" />
          <text
            x={busX + 14}
            y={y + 22}
            className="font-mono"
            fontSize="10"
            fill="var(--muted-foreground)"
            letterSpacing="0.05em"
          >
            {String(i + 1).padStart(2, '0')}
          </text>
          <rect
            className="bp-node"
            x="480"
            y={y}
            width="150"
            height="56"
            rx="3"
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth="1.5"
            style={{ animationDelay: `${500 + i * 100}ms` }}
          />
          <text
            x="555"
            y={y + 33}
            textAnchor="middle"
            className="font-mono"
            fontSize="12"
            fill="var(--foreground)"
            letterSpacing="0.02em"
          >
            {EDITORS[i].toUpperCase()}
          </text>
        </g>
      ))}

      {/* hub node */}
      <rect
        className="bp-node"
        x="10"
        y="184"
        width="170"
        height="100"
        rx="3"
        fill="var(--card)"
        stroke="var(--primary)"
        strokeWidth="2"
        style={{ animationDelay: '0ms' }}
      />
      <circle cx="180" cy={hubMidY} r="3.5" fill="var(--primary)" />
      <text x="95" y="220" textAnchor="middle" className="font-mono" fontSize="13" fill="var(--foreground)">
        ~/.chain-hub
      </text>
      <text x="95" y="240" textAnchor="middle" className="font-mono" fontSize="8.5" fill="var(--muted-foreground)" letterSpacing="0.03em">
        SKILLS · AGENTS · WORKFLOWS
      </text>
      <text x="95" y="253" textAnchor="middle" className="font-mono" fontSize="8.5" fill="var(--muted-foreground)" letterSpacing="0.03em">
        RULES · MEMORY
      </text>
    </svg>
  );
}

function FramedFigure({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <div className="text-left">
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        aria-label={`${alt} — opens full size in a new tab`}
        className="group bp-corners block border border-border rounded-sm overflow-hidden bg-card aspect-[16/10] cursor-zoom-in"
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover object-top block transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </a>
      <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase mt-3">
        {caption} — <span className="text-primary">view full size</span>
      </p>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <TitleblockBar />

      {/* Hero */}
      <section className="bp-grid border-b border-border">
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

      {/* Proof */}
      <section id="proof" className="max-w-6xl mx-auto px-6 py-16 border-b border-border">
        <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-8">
          Detail — the real local dashboard, not a mockup
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <FramedFigure
            src={dashboardOverview}
            alt="Chain Hub dashboard overview showing hub status and asset counts"
            caption="Fig. 1 — Hub status, live local dashboard"
          />
          <FramedFigure
            src={dashboardLibrary}
            alt="Chain Hub dashboard library showing skills and agents"
            caption="Fig. 2 — Library, browsing skills and agents"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="bp-grid">
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

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
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
