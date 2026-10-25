import { ArrowLeft, Download, ExternalLink, FolderTree, ShieldAlert, Star } from 'lucide-react';

import { Alert, AlertDescription, AlertIcon } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CatalogEntryResult } from '@/types';
import { resolveKindMeta } from '../library/asset-helpers';
import { CATALOG_CATEGORY_LABELS, formatStarCount, resolveCatalogSourceUrl } from './catalog-helpers';
import { useGithubStars } from './use-github-stars';

interface CatalogDetailPanelProps {
  entry: CatalogEntryResult;
  updateAvailable: boolean;
  isInstalling: boolean;
  onBack: () => void;
  onInstall: () => void;
  onOpenInLibrary: () => void;
}

export function CatalogDetailPanel({
  entry,
  updateAvailable,
  isInstalling,
  onBack,
  onInstall,
  onOpenInLibrary
}: CatalogDetailPanelProps) {
  const meta = resolveKindMeta(entry.kind);
  const stars = useGithubStars(entry.source.repo);
  const sourceUrl = resolveCatalogSourceUrl(entry.source);
  const sourceLabel = entry.source.subdir ? `${entry.source.repo} · ${entry.source.subdir}` : entry.source.repo;

  return (
    <Card
      aria-label={`${entry.name} details`}
      className={cn(
        'fixed inset-0 z-40 flex min-w-0 flex-col overflow-hidden rounded-none border-0 bg-card',
        'xl:static xl:z-auto xl:rounded-xl xl:border xl:border-border xl:bg-card'
      )}
      role="region"
    >
      <CardHeader>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Button className="xl:hidden" onClick={onBack} size="icon-sm" type="button" variant="ghost">
            <ArrowLeft className="size-4" />
            <span className="sr-only">Back to catalog</span>
          </Button>
          <div className="grid min-w-0 flex-1 gap-1">
            <CardTitle className="truncate">{entry.name}</CardTitle>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {entry.kind}/{entry.id}
            </p>
            {entry.author ? <p className="text-xs text-muted-foreground">Author · {entry.author}</p> : null}
          </div>
        </div>
        <Badge variant="accent">{meta.label}</Badge>
      </CardHeader>

      <CardContent className="grid flex-1 content-start gap-5 overflow-y-auto">
        <p className="max-w-prose text-sm leading-6 text-foreground">{entry.description}</p>

        {entry.hasScripts ? (
          <Alert variant="warning">
            <AlertIcon>
              <ShieldAlert />
            </AlertIcon>
            <AlertDescription>
              This {meta.label.toLowerCase()} bundles executable scripts. Review them in the source before
              using it; Chain Hub never runs scripts on install.
            </AlertDescription>
          </Alert>
        ) : null}

        <dl className="grid gap-3 text-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-6">
          <dt className="text-xs font-medium text-muted-foreground">Source</dt>
          <dd className="min-w-0">
            {sourceUrl ? (
              <a
                className="inline-flex max-w-full items-center gap-1.5 rounded-sm font-mono text-xs text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                <span className="truncate">{sourceLabel}</span>
                <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
              </a>
            ) : (
              <span className="break-all font-mono text-xs text-foreground">{sourceLabel}</span>
            )}
          </dd>
          {entry.source.ref ? (
            <>
              <dt className="text-xs font-medium text-muted-foreground">Ref</dt>
              <dd className="font-mono text-xs text-foreground">{entry.source.ref}</dd>
            </>
          ) : null}
          <dt className="text-xs font-medium text-muted-foreground">License</dt>
          <dd className="text-foreground">{entry.license ?? 'Not specified'}</dd>
          <dt className="text-xs font-medium text-muted-foreground">Category</dt>
          <dd className="text-foreground">{CATALOG_CATEGORY_LABELS[entry.category]}</dd>
          {stars !== null ? (
            <>
              <dt className="text-xs font-medium text-muted-foreground">Stars</dt>
              <dd className="inline-flex items-center gap-1 tabular-nums text-foreground">
                <Star aria-hidden="true" className="size-3.5 text-muted-foreground" />
                {formatStarCount(stars)}
              </dd>
            </>
          ) : null}
          <dt className="text-xs font-medium text-muted-foreground">Catalog</dt>
          <dd className="font-mono text-xs text-foreground">{entry.sourceId}</dd>
        </dl>

        {entry.tags.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">Tags</p>
            <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <li key={tag}>
                  <Badge>{tag}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>

      <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3">
        {entry.installed ? (
          <>
            <Badge variant="success">Installed</Badge>
            {updateAvailable ? (
              <p className="text-xs text-muted-foreground">An upstream update is available; update it from Library.</p>
            ) : null}
            <Button className="ml-auto" onClick={onOpenInLibrary} size="sm" type="button" variant="outline">
              <FolderTree className="size-4" />
              Open in Library
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Installs into your hub from the upstream source and records its provenance.
            </p>
            <Button className="ml-auto" loading={isInstalling} onClick={onInstall} size="sm" type="button">
              <Download className="size-4" />
              Install
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
