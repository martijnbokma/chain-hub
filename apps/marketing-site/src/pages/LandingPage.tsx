import React from 'react';
import {
  BookOpen,
  Bot,
  Workflow,
  ScrollText,
  Brain,
  Link2,
  Terminal,
  LayoutDashboard,
  Mail,
} from 'lucide-react';
import dashboardOverview from '../assets/dashboard-overview.webp';
import dashboardLibrary from '../assets/dashboard-library.webp';

const EDITORS = ['Cursor', 'Claude Code', 'Windsurf', 'Zed'];

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

function TitleblockBar() {
  return (
    <header className="max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-sm border border-primary flex items-center justify-center font-mono text-xs text-primary">
          CH
        </div>
        <span className="font-display font-semibold text-xl tracking-wide text-foreground uppercase">
          Chain Hub
        </span>
      </div>
      <div className="font-mono text-[11px] tracking-widest text-muted-foreground border border-border rounded-sm px-3 py-1.5 uppercase">
        Rev A — Preview
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
      <div className="bp-corners border border-border rounded-sm overflow-hidden bg-card aspect-[16/10]">
        <img src={src} alt={alt} className="w-full h-full object-cover object-top block" loading="lazy" />
      </div>
      <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase mt-3">{caption}</p>
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
              Stop copy-pasting the same rules and prompts into every editor. Chain Hub keeps
              skills, agents, workflows, rules, and memory in one folder on disk, synced out to
              Cursor, Claude Code, Windsurf, and Zed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <a
                href="#waitlist"
                className="px-6 py-3 rounded-sm bg-primary hover:opacity-90 text-primary-foreground font-medium transition-opacity text-center"
              >
                Join the waitlist
              </a>
              <a
                href="#proof"
                className="px-6 py-3 rounded-sm border border-border text-foreground hover:border-ring transition-colors text-center"
              >
                See the dashboard
              </a>
            </div>
            <div className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase border-t border-border pt-4 flex flex-wrap gap-x-6 gap-y-1">
              <span>Sheet 1/1</span>
              <span>Local-first</span>
              <span>Scale 1:1</span>
              <span>Chain Hub</span>
            </div>
          </div>
          <HubSchematic />
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
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
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
              <p className="text-sm text-muted-foreground mb-4">{tagline}</p>
              <ul className="space-y-2">
                {points.map((point) => (
                  <li key={point} className="text-sm text-muted-foreground flex items-start gap-2 font-mono">
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
      <section id="waitlist" className="bp-grid">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="font-display font-bold text-4xl md:text-5xl uppercase text-foreground mb-4">
            Ready when you are.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Chain Hub is pre-launch. Leave your email and we'll notify you when the CLI and
            dashboard ship.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto mb-4">
            <input
              type="email"
              placeholder="you@domain.com"
              className="flex-1 px-4 py-3 rounded-sm bg-card border border-input text-foreground placeholder-muted-foreground font-mono text-sm focus:outline-none focus:border-ring transition-colors"
            />
            <button className="px-6 py-3 rounded-sm bg-primary hover:opacity-90 text-primary-foreground font-medium transition-opacity flex items-center justify-center gap-2 whitespace-nowrap">
              <Mail size={16} />
              Notify me
            </button>
          </div>
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          Rev A — Chain Hub
        </div>
        <div className="flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
          <a href="#" className="hover:text-foreground transition-colors">Discord</a>
          <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
