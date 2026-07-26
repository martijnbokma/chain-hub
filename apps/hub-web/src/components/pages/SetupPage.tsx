import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { Eyebrow } from '@/components/common/Eyebrow';
import { setupApi } from '@/lib/api';
import type { SetupGuide } from '@/types';

export function SetupPage() {
  const queryClient = useQueryClient();
  const guide = useQuery({
    queryKey: ['setup'],
    queryFn: () => setupApi.getGuide()
  });

  const setupEditors = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/integrations/setup', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Unable to connect editors');
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      void queryClient.invalidateQueries({ queryKey: ['integrations'] });
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
      toast.success('Editors connected');
    },
    onError: () => {
      toast.error('Unable to connect editors');
    }
  });

  if (guide.isLoading) {
    return <EmptyState description="The guided setup is loading." title="Loading setup guide" />;
  }

  if (guide.isError || !guide.data) {
    return <EmptyState description="The setup guide is temporarily unavailable." title="Unable to load setup guide" />;
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div>
          <Eyebrow>Setup</Eyebrow>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Sequential setup, not scattered features.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            The rebuild turns first-run into a calm checklist: initialize the local hub, create your first reusable
            asset, connect editors, then validate the structure.
          </p>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <Badge variant="success">Chain home</Badge>
          </CardHeader>
          <CardContent>
            <p className="break-all text-sm text-muted-foreground">{guide.data.chainHome}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {guide.data.steps.map((step, index) => (
          <Card key={step.id}>
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="font-display text-sm text-primary">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <Eyebrow>{step.status}</Eyebrow>
                  <CardTitle>{step.label}</CardTitle>
                </div>
              </div>
              <Badge variant={step.complete ? 'success' : 'warning'}>{step.complete ? 'Done' : 'Open'}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4">
              <CardDescription>{step.description}</CardDescription>
              {step.action === 'connect' && !step.complete ? (
                <Button disabled={setupEditors.isPending} onClick={() => setupEditors.mutate()}>
                  {setupEditors.isPending ? 'Connecting...' : 'Connect editors'}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}