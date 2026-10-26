import { LogoMark } from '../../components/PageChrome';
import { Reveal } from '../../components/Reveal';
import { SectionHead } from './SectionHead';
import { BAND_VARS } from './bandVars';

const editors = ['Claude Code', 'Cursor', 'Devin CLI', 'Windsurf', 'Zed', 'Antigravity'];

const drift = [
  { editor: 'Claude Code', status: 'CLAUDE.md · v1' },
  { editor: 'Cursor', status: '.cursor/rules · v3' },
  { editor: 'Devin CLI', status: '.devin/rules · missing' },
  { editor: 'Windsurf', status: '.windsurf/rules · v2 ?' },
  { editor: 'Zed', status: '.rules · missing' },
  { editor: 'Antigravity', status: 'AGENTS.md · missing' },
];

export function ProblemSection() {
  return (
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
  );
}
