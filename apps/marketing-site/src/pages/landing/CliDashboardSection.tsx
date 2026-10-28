import { LayoutDashboard, Terminal } from 'lucide-react';
import { Reveal } from '../../components/Reveal';
import { SectionHead } from './SectionHead';
import { BAND_VARS } from './bandVars';

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

export function CliDashboardSection() {
  return (
    <section className="border-b border-border">
      <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
        <SectionHead
          index="04"
          kicker="Two ways to use it"
          title="Terminal or dashboard"
          copy="Both work on the same hub folder. Use the command line when you're in flow, and the dashboard when you want the whole picture."
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
  );
}
