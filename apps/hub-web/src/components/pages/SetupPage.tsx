import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { setupApi, integrationsApi, validateApi } from '@/lib/api';
import { SetupStepItem } from './SetupStepItem';
export function SetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const guide = useQuery({
    queryKey: ['setup'],
    queryFn: () => setupApi.getGuide()
  });

  const runValidate = useMutation({
    mutationFn: () => validateApi.run(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      if (result.ok) {
        toast.success('Structure is valid — no issues found');
      } else {
        toast.error(`${result.issues.length} issue${result.issues.length === 1 ? '' : 's'}: ${result.issues.slice(0, 2).join('; ')}${result.issues.length > 2 ? '…' : ''}`);
      }
    },
    onError: () => {
      toast.error('Unable to run validation');
    }
  });

  const setupEditors = useMutation({
    mutationFn: async () => {
      return integrationsApi.setup();
    },
    onSuccess: (integrations) => {
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['integrations'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });

      const installed = integrations.filter((integration) => integration.installed);
      if (installed.length === 0) {
        toast.warning('No supported editor found on this machine');
        return;
      }
      const failed = installed.filter((integration) => !integration.connected);
      if (failed.length > 0) {
        toast.warning(
          `Connected ${installed.length - failed.length}/${installed.length} editors — ${failed
            .map((integration) => integration.label)
            .join(', ')} failed`
        );
        return;
      }
      toast.success(`Connected ${installed.length} editor${installed.length === 1 ? '' : 's'}`);
    },
    onError: () => {
      toast.error('Unable to connect editors');
    }
  });

  if (guide.isLoading) {
    return <PageSkeleton variant="checklist" />;
  }

  if (guide.isError || !guide.data) {
    return <EmptyState description="The setup guide is temporarily unavailable." title="Unable to load setup guide" />;
  }

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-8">
      <header className="grid gap-3">
        <div className="grid gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Get your hub ready
          </h2>
          <p className="max-w-2xl text-sm leading-5 text-muted-foreground">
            Four steps to get every editor reading from one source of truth — so a skill or rule you
            write once shows up everywhere, not just where you wrote it.
          </p>
        </div>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Chain home</span>
          <code className="break-all font-mono text-xs text-foreground">
            {guide.data.chainHome}
          </code>
        </p>
      </header>

      <ol className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {guide.data.steps.map((step, index) => (
          <SetupStepItem
            index={index}
            key={step.id}
            onCreateAsset={() => navigate('/library?create=1')}
            runValidate={runValidate}
            setupEditors={setupEditors}
            step={step}
          />
        ))}
      </ol>
    </section>
  );
}
