import { Reveal } from '../../components/Reveal';
import {
  AgentsIcon,
  EditorsIcon,
  PromptsIcon,
  RulesIcon,
  SkillsIcon,
  WorkflowsIcon,
} from './AssetIcons';
import { SectionHead } from './SectionHead';

const assets = [
  { icon: SkillsIcon, name: 'Skills', description: 'Reusable abilities your AI can call on when it needs them.', ref: 'skills/' },
  { icon: AgentsIcon, name: 'Agents', description: 'Saved roles and personalities for specific kinds of work.', ref: 'agents/' },
  { icon: WorkflowsIcon, name: 'Workflows', description: 'Multi-step processes you write down once and reuse everywhere.', ref: 'workflows/' },
  { icon: RulesIcon, name: 'Rules', description: 'Standing instructions your AI always follows.', ref: 'rules/' },
  { icon: PromptsIcon, name: 'Prompts', description: 'A reusable prompt for one specific task.', ref: 'prompts/' },
  { icon: EditorsIcon, name: 'Editor connections', description: 'The links that put the same files into every editor you use.', ref: 'chain setup' },
];

export function AssetsSection() {
  return (
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
  );
}
