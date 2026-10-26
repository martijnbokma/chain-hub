import { Reveal } from '../../components/Reveal';
import { CopyCommand } from './CopyCommand';
import { SectionHead } from './SectionHead';

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

export function HowItWorksSection() {
  return (
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
  );
}
