import React from 'react';
import { Card } from '@/components/ui/card';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card className="mx-auto w-full max-w-3xl p-4">
      <div className="grid gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}