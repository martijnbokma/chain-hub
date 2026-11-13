import {
  FolderTree,
  LayoutDashboard,
  Link2,
  ListChecks,
  Monitor,
  Moon,
  Plus,
  Settings,
  Store,
  Sun,
  type LucideIcon
} from 'lucide-react';

export type CommandActionGroup = 'Navigate' | 'Appearance' | 'Hub';

export interface CommandActionSpec {
  id: string;
  label: string;
  description: string;
  keywords: string;
  group: CommandActionGroup;
  icon: LucideIcon;
}

export interface CommandAction extends CommandActionSpec {
  run: () => void;
}

export const COMMAND_GROUPS: CommandActionGroup[] = ['Navigate', 'Appearance', 'Hub'];

export const COMMAND_ACTION_SPECS: CommandActionSpec[] = [
  {
    id: 'go-overview',
    label: 'Open overview',
    description: 'See health, storage, and asset counts.',
    keywords: 'overview health storage dashboard',
    group: 'Navigate',
    icon: LayoutDashboard
  },
  {
    id: 'go-library',
    label: 'Open library',
    description: 'Browse indexed assets and edit content.',
    keywords: 'library assets editor skills rules workflows agents',
    group: 'Navigate',
    icon: FolderTree
  },
  {
    id: 'go-catalog',
    label: 'Open catalog',
    description: 'Browse community skills, agents, and workflows to install.',
    keywords: 'catalog community browse install discover marketplace',
    group: 'Navigate',
    icon: Store
  },
  {
    id: 'create-asset',
    label: 'Create asset',
    description: 'Jump to the library and open the create flow.',
    keywords: 'new asset create library',
    group: 'Navigate',
    icon: Plus
  },
  {
    id: 'go-integrations',
    label: 'Open integrations',
    description: 'Inspect editor mounts and adapter state.',
    keywords: 'integrations editors mounts adapters',
    group: 'Navigate',
    icon: Link2
  },
  {
    id: 'go-settings',
    label: 'Open settings',
    description: 'Configure appearance and AI providers.',
    keywords: 'settings ai anthropic openai mistral ollama api key theme appearance',
    group: 'Navigate',
    icon: Settings
  },
  {
    id: 'go-setup',
    label: 'Open setup',
    description: 'Review the guided setup checklist.',
    keywords: 'setup guided checklist onboarding',
    group: 'Navigate',
    icon: ListChecks
  },
  {
    id: 'theme-light',
    label: 'Use light theme',
    description: 'Switch to Cool Trust light.',
    keywords: 'theme light appearance day',
    group: 'Appearance',
    icon: Sun
  },
  {
    id: 'theme-dark',
    label: 'Use dark theme',
    description: 'Switch to Cool Trust dark.',
    keywords: 'theme dark appearance night',
    group: 'Appearance',
    icon: Moon
  },
  {
    id: 'theme-system',
    label: 'Use system theme',
    description: 'Follow the OS light/dark preference.',
    keywords: 'theme system appearance auto',
    group: 'Appearance',
    icon: Monitor
  },
  {
    id: 'connect-editors',
    label: 'Connect editors',
    description: 'Run the integration setup flow.',
    keywords: 'connect editors integrations setup',
    group: 'Hub',
    icon: Link2
  }
];
