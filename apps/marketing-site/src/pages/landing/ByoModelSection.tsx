import { Reveal } from '../../components/Reveal';
import { SectionHead } from './SectionHead';
import { BAND_VARS } from './bandVars';

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

export function ByoModelSection() {
  return (
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
  );
}
