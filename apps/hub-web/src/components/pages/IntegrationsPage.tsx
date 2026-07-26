import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { Eyebrow } from '@/components/common/Eyebrow';
import { integrationsApi } from '@/lib/api';
import type { Integration } from '@/types';

export function IntegrationsPage() {
  const queryClient = useQueryClient();
  const integrations = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.getAll()
  });

  const setup = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/integrations/setup', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Unable to setup integrations');
      }
      return response.json() as Promise<Integration[]>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['integrations'] });
      void queryClient.invalidateQueries({ queryKey: ['setup'] });
      toast.success('Editors connected');
    },
    onError: () => {
      toast.error('Unable to setup integrations');
    }
  });

  if (integrations.isLoading) {
    return <EmptyState description="Integration status is loading." title="Loading integrations" />;
  }

  if (integrations.isError) {
    return <EmptyState description="Integration status is temporarily unavailable." title="Unable to load integrations" />;
  }

  if (!integrations.data) {
    return <EmptyState description="There is no integration data to show yet." title="Integrations unavailable" />;
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow>Integrations</Eyebrow>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            One mounted hub per editor.
          </h2>
        </div>
        <Button disabled={setup.isPending} onClick={() => setup.mutate()}>
          {setup.isPending ? 'Connecting...' : 'Connect editors'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {integrations.data.map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <div>
                <Eyebrow>Adapter</Eyebrow>
                <CardTitle>{integration.label}</CardTitle>
              </div>
              <Badge variant={integration.connected ? 'success' : 'warning'}>
                {integration.connected ? 'Connected' : 'Missing'}
              </Badge>
            </CardHeader>
            <CardContent className="grid gap-2">
              {integration.targetPaths.map((targetPath) => (
                <p key={targetPath} className="break-all text-sm text-muted-foreground">
                  {targetPath}
                </p>
              ))}
              <p className="text-sm text-muted-foreground">Mode: {integration.mode}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {integration.supportedKinds.map((kind) => (
                  <Badge key={kind} variant="accent">
                    {kind}
                  </Badge>
                ))}
                {integration.unsupportedKinds.map((kind) => (
                  <Badge key={kind} variant="default" className="opacity-60 line-through">
                    {kind}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}