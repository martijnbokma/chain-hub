import { useState } from 'react';

import type { SecurityScanFinding, SecurityScanSeverity } from '@chain-hub/contracts';

import { Badge } from '@/components/ui/badge';

/** One row per rule+severity: repeat hits collapse into a single entry listing every file it touched. */
interface FindingGroup {
  ruleId: string;
  severity: SecurityScanSeverity;
  title: string;
  detail: string;
  files: string[];
}

/** Collapse repeated hits of the same rule into one row listing every file it touched, worst severity first. */
function groupScanFindings(findings: SecurityScanFinding[]): FindingGroup[] {
  const rank: Record<SecurityScanSeverity, number> = { high: 0, medium: 1, low: 2 };
  const groups = new Map<string, FindingGroup>();
  for (const finding of findings) {
    const key = `${finding.severity}:${finding.ruleId}`;
    const location = finding.file ? `${finding.file}${finding.line ? `:${finding.line}` : ''}` : null;
    const group = groups.get(key);
    if (group) {
      if (location && !group.files.includes(location)) {
        group.files.push(location);
      }
    } else {
      groups.set(key, {
        ruleId: finding.ruleId,
        severity: finding.severity,
        title: finding.title,
        detail: finding.detail,
        files: location ? [location] : []
      });
    }
  }
  return [...groups.values()].sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/**
 * Plain-language framing per scanner rule: what the pattern means and when it is
 * actually a problem. Rules without an entry (e.g. `ai-review` findings, which
 * carry model-written titles and details) fall back to the finding's own text.
 */
const RULE_GUIDANCE: Record<string, { title: string; help: string }> = {
  'remote-code-exec': {
    title: 'Runs code downloaded from the internet',
    help: 'Whatever the URL serves gets executed. Install only if you fully trust that URL.'
  },
  'exfil-endpoint': {
    title: 'Mentions a service often used to collect stolen data',
    help: 'There are legitimate uses, but check why this service is referenced.'
  },
  'secret-file-exfil': {
    title: 'Reads sensitive files and sends them elsewhere',
    help: 'This is the classic shape of data theft. Do not install unless you are sure it is a false alarm.'
  },
  'env-exfil': {
    title: 'Sends environment variables to an outside address',
    help: 'Environment variables usually hold API keys and tokens. Do not install unless you are sure it is a false alarm.'
  },
  'trojan-source': {
    title: 'Uses hidden characters that can disguise what code does',
    help: 'What you read may not be what runs. Do not install unless the file checks out.'
  },
  destructive: {
    title: 'Can delete files or damage the system',
    help: 'Do not install unless you have verified these commands are safe.'
  },
  persistence: {
    title: 'Installs something that keeps running later',
    help: 'Schedules or hooks execution outside the skill itself. Most skills do not need this.'
  },
  'prompt-injection': {
    title: 'Tells the AI agent to ignore its own rules',
    help: 'Or to hide actions from you. Harmless when quoted as an example, dangerous as a real instruction.'
  },
  'system-write': {
    title: 'Changes system or hub-internal files',
    help: 'Well outside what a skill should touch. Verify before installing.'
  },
  'credential-exfil-risk': {
    title: 'Touches sensitive data and the network in the same file',
    help: 'A common data-theft shape. Review this file before installing.'
  },
  'binary-payload': {
    title: 'Ships a ready-to-run program',
    help: 'Its contents cannot be reviewed as text. Check that it belongs in the skill.'
  },
  'bundled-secrets': {
    title: 'Ships a file that looks like stored credentials',
    help: 'Check it is a template, not real secret material.'
  },
  'credential-access': {
    title: 'Reaches for keys, passwords or other secrets',
    help: 'Check whether the skill actually needs that access.'
  },
  'config-tamper': {
    title: 'Changes editor or agent configuration',
    help: 'Verify the skill is meant to manage those settings.'
  },
  'hidden-instruction': {
    title: 'Hides instructions inside comments or markup',
    help: 'Invisible when you read the file, still read by the agent. Check what it says.'
  },
  obfuscation: {
    title: 'Contains encoded or hidden content',
    help: 'Usually just bundled data, but it can hide a payload. Skim the file.'
  },
  'exec-primitive': {
    title: 'Runs programs or dynamic code',
    help: 'Normal for skills that ship helper scripts. Check they do what the skill describes.'
  },
  'clipboard-capture': {
    title: 'Reads the clipboard or screen',
    help: 'Clipboards often hold secrets. Check why the skill needs this.'
  },
  'network-outbound': {
    title: 'Contacts the internet',
    help: 'Check the calls go where the skill says they go.'
  },
  'insecure-http': {
    title: 'Uses an unencrypted HTTP address',
    help: 'Often just a link in documentation; worth a glance.'
  }
};

const SEVERITY_LABEL: Record<SecurityScanSeverity, string> = {
  high: 'high — likely malicious or dangerous if executed',
  medium: 'medium — suspicious shape, common in legitimate content too',
  low: 'low — informational, almost certainly benign'
};

const SEVERITY_VARIANT: Record<SecurityScanSeverity, 'destructive' | 'warning' | 'default'> = {
  high: 'destructive',
  medium: 'warning',
  low: 'default'
};

const MAX_VISIBLE_FILES = 3;

/** Plain-language scan findings, grouped per rule: friendly title, one-sentence guidance, capped file list. */
export function ScanFindingsList({ findings }: { findings: SecurityScanFinding[] }) {
  return (
    <ul className="grid gap-2.5">
      {groupScanFindings(findings).map((group) => {
        const guidance = RULE_GUIDANCE[group.ruleId];
        return (
          <li className="flex items-start gap-2 text-xs" key={`${group.severity}-${group.ruleId}`}>
            <Badge title={SEVERITY_LABEL[group.severity]} variant={SEVERITY_VARIANT[group.severity]}>
              {group.severity}
            </Badge>
            <span className="min-w-0">
              <span className="font-medium">{guidance?.title ?? group.title}</span>
              <span className="block text-muted-foreground">{guidance?.help ?? group.detail}</span>
              <FileLocations files={group.files} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The first few affected file locations; the rest sit behind a toggle. */
function FileLocations({ files }: { files: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (files.length === 0) {
    return null;
  }
  const visible = expanded ? files : files.slice(0, MAX_VISIBLE_FILES);
  return (
    <span className="block font-mono text-[11px] text-muted-foreground">
      {visible.join(', ')}
      {files.length > MAX_VISIBLE_FILES ? (
        <button
          className="ml-1 cursor-pointer font-sans underline decoration-muted-foreground/50 underline-offset-2 hover:text-foreground"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? 'show fewer' : `and ${files.length - MAX_VISIBLE_FILES} more`}
        </button>
      ) : null}
    </span>
  );
}
