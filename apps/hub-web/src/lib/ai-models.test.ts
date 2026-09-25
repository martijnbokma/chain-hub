import { describe, expect, it } from 'vitest';

import { aiProviders, DEFAULT_AI_MODELS } from '@chain-hub/contracts';

import { AI_MODEL_OPTIONS, AI_PROVIDER_LINKS, CUSTOM_MODEL_VALUE, resolveModelSelectValue } from './ai-models';

describe('AI model options', () => {
  it('lists every provider with docs links and at least one model', () => {
    for (const provider of aiProviders) {
      expect(AI_MODEL_OPTIONS[provider].length).toBeGreaterThan(0);
      expect(AI_PROVIDER_LINKS[provider].docs.href).toMatch(/^https:\/\//);
    }
  });

  it("offers each provider's default model in its dropdown", () => {
    for (const provider of aiProviders) {
      expect(resolveModelSelectValue(DEFAULT_AI_MODELS[provider], provider)).toBe(DEFAULT_AI_MODELS[provider]);
    }
  });

  it('falls back to the custom option for unknown model ids', () => {
    expect(resolveModelSelectValue('my-finetune', 'openai')).toBe(CUSTOM_MODEL_VALUE);
  });
});
