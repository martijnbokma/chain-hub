import { GithubIcon } from '../../components/PageChrome';
import { HubSchematic } from './HubSchematic';
import { SignalPeriod } from './SignalPeriod';
import { REPO_URL } from './shared';

export function HeroSection() {
  return (
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
  );
}
