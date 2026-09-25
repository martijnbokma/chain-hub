import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';
import { aiSettingsApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

import { AiSettingsForm } from './settings/AiSettingsForm';

export function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const settings = useQuery({
    queryKey: queryKeys.aiSettings,
    queryFn: () => aiSettingsApi.get()
  });

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8">
      <header className="grid gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Settings</h2>
        <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
          Appearance, hub setup, and local AI providers for drafting Library assets.
        </p>
      </header>

      <section className="grid gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
        <div className="grid gap-1">
          <h3 className="text-sm font-medium text-foreground">Hub setup</h3>
          <p className="text-sm text-muted-foreground">
            Revisit the guided checklist anytime — initialize the hub, add a first asset, connect
            editors, and validate structure.
          </p>
        </div>
        <Link className={cn(buttonVariants({ variant: 'secondary' }), 'w-fit')} to="/setup">
          Open guided setup
        </Link>
      </section>

      <section className="grid gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
        <div className="grid gap-1">
          <h3 className="text-sm font-medium text-foreground">Appearance</h3>
          <p className="text-sm text-muted-foreground">
            Light Cool Trust and Cool Trust Dark are both first-class. Switch anytime here, from the
            header moon/sun control, or via the command palette.
          </p>
        </div>
        <div className="grid gap-2">
          <span className="text-sm text-muted-foreground">Theme</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
            {(
              [
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' }
              ] as const
            ).map((option) => (
              <Button
                key={option.value}
                onClick={() => setPreference(option.value)}
                type="button"
                variant={preference === option.value ? 'default' : 'secondary'}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {settings.isLoading ? <PageSkeleton variant="checklist" /> : null}

      {settings.isError || (!settings.isLoading && !settings.data) ? (
        <EmptyState description="AI settings are temporarily unavailable." title="Unable to load AI settings" />
      ) : null}

      {settings.data ? <AiSettingsForm settings={settings.data} /> : null}
    </section>
  );
}
