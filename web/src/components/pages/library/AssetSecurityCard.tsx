import { AlertTriangle, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';

import type { SecurityScanRecord } from '@chain-hub/contracts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { ScanFindingsList } from './ScanFindings';

const VERDICT_META = {
  pass: {
    label: 'Pass',
    icon: ShieldCheck,
    variant: 'success' as const,
    explanation:
      'The scanner found no suspicious patterns. This asset was checked before it was installed — no action needed.'
  },
  warn: {
    label: 'Warn',
    icon: ShieldQuestion,
    variant: 'warning' as const,
    explanation:
      'The scanner found patterns that appear in both legitimate and malicious content, so nothing was blocked — but the findings below are worth a look before you trust this asset.'
  },
  fail: {
    label: 'Blocked',
    icon: ShieldAlert,
    variant: 'destructive' as const,
    explanation:
      'The scanner found strongly suspicious patterns and stopped this content from installing. Review the findings; install only if you trust the source and allow it explicitly.'
  }
};

interface AssetSecurityCardProps {
  scan: SecurityScanRecord | null | undefined;
  isRescanning: boolean;
  onRescan: () => void;
}

/** Security scan status for the selected asset: verdict, findings, override marker, rescan. */
export function AssetSecurityCard({ scan, isRescanning, onRescan }: AssetSecurityCardProps) {
  if (!scan) {
    return null;
  }
  const meta = VERDICT_META[scan.verdict] ?? VERDICT_META.warn;
  const Icon = meta.icon;
  return (
    <Card>
      <CardContent className="grid gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="size-4" aria-hidden />
            <span className="text-xs font-medium">Security scan</span>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            {scan.overriddenAt ? (
              <Badge variant="warning">
                <AlertTriangle className="size-3" aria-hidden /> Allowed anyway
              </Badge>
            ) : null}
          </div>
          <Button loading={isRescanning} onClick={onRescan} size="sm" variant="ghost">
            Rescan
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{meta.explanation}</p>
        <p className="text-xs text-muted-foreground">
          Scanned {new Date(scan.scannedAt).toLocaleString()},{' '}
          {scan.engines.map((e) => (e === 'static' ? 'rules' : 'AI review')).join(' + ')}, {scan.context}
        </p>
        {scan.aiError ? (
          <p className="text-xs text-muted-foreground">
            AI review was unavailable. The verdict below comes from the local rules engine only.
          </p>
        ) : null}
        {scan.findings.length > 0 ? (
          <ScanFindingsList findings={scan.findings} />
        ) : (
          <p className="text-xs text-muted-foreground">No suspicious behavior found by the rules engine.</p>
        )}
      </CardContent>
    </Card>
  );
}
