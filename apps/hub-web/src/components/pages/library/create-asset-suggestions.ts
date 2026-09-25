import type { AssetKind } from '@/types';

/** Example intents shown as prompt suggestions in the Create dialog, per asset kind. */
export const INTENT_SUGGESTIONS: Record<AssetKind, readonly string[]> = {
  prompts: [
    'Review a PR for security issues and suggest concrete fixes',
    'Turn messy meeting notes into clear action items',
    'Write a concise commit message from a diff summary',
    'Explain a codebase concept to a junior engineer'
  ],
  skills: [
    'Audit React components for accessibility issues',
    'Refactor messy TypeScript modules with safe steps',
    'Plan and run a careful database migration',
    'Review API design for consistency and error handling'
  ],
  agents: [
    'A careful code reviewer focused on regressions',
    'A senior frontend engineer for React + Tailwind',
    'A debugging partner that asks clarifying questions first',
    'A technical writer that turns diffs into clear changelogs'
  ],
  workflows: [
    'Ship a feature from branch to PR with checklist steps',
    'Triage a production bug from report to fix',
    'Onboard a new package into this monorepo',
    'Prepare a release: changelog, version, and tags'
  ],
  rules: [
    'Always use named exports and avoid barrel files',
    'Prefer Tailwind semantic tokens — no hex or arbitrary px',
    'Keep tests colocated and cover new domain logic',
    'Never commit secrets or modify schema without a plan'
  ]
};

/** Mixed-kind examples for "Auto" kind detection. */
export const AUTO_SUGGESTIONS = [
  INTENT_SUGGESTIONS.skills[0],
  INTENT_SUGGESTIONS.prompts[0],
  INTENT_SUGGESTIONS.workflows[0],
  INTENT_SUGGESTIONS.agents[0],
  INTENT_SUGGESTIONS.rules[0]
] as const;
