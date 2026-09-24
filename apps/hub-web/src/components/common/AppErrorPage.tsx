import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/** Shown instead of a blank screen or the router's debug page when a page crashes while rendering. */
export function AppErrorPage() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error);

  useEffect(() => {
    console.error('[chain-hub] page crashed:', error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="grid w-full max-w-lg gap-4 p-6" role="alert">
        <div className="grid gap-1">
          <h1 className="text-base font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm leading-5 text-muted-foreground">
            This page hit an unexpected error. Your hub files are safe; reloading usually fixes it.
          </p>
        </div>
        <code className="break-words rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground">{message}</code>
        <Button className="w-fit" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </Card>
    </main>
  );
}
