import { Reveal } from '../../components/Reveal';
import { SectionHead } from './SectionHead';
import { BAND_VARS } from './bandVars';

export function LearnSyncSection() {
  return (
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
  );
}
