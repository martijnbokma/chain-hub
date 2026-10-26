import { GithubIcon, LogoLockup, LogoMark } from '../../components/PageChrome';
import { Reveal } from '../../components/Reveal';
import { SignalPeriod } from './SignalPeriod';
import { REPO_URL } from './shared';

export function CtaSection() {
  return (
    <>
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
    </>
  );
}
