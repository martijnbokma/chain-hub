import type { listAssetCompatIssues } from '@chain-hub/contracts';
import type {
  AssetKind,
  AuditAssetResult,
  ClassifyAssetResult,
  SkillFileEntry,
  SkillLockEntry
} from '@/types';
import { AssetAuditCard } from './AssetAuditCard';
import { AssetCompatBanner } from './AssetCompatBanner';
import { AssetKindAssessment } from './AssetKindAssessment';
import { AssetPackageFilesStrip } from './AssetPackageFilesStrip';
import { AssetProvenanceCard } from './AssetProvenanceCard';

type CompatIssue = ReturnType<typeof listAssetCompatIssues>[number];

interface AssetInfoStackProps {
  selected: { kind: AssetKind; name: string };
  nonDirectoryFiles: SkillFileEntry[];
  blockingCompatIssue: CompatIssue | null;
  provenance: SkillLockEntry | null | undefined;
  upstreamBrowseUrl: string | null;
  isUpstreamSkill: boolean;
  updateAvailable: boolean;
  isRetryingCheck?: boolean;
  isUnlinking?: boolean;
  isFixingDescriptionWithAi: boolean;
  isForkingAndFixingHeading: boolean;
  isForkingAndFixingWithAi: boolean;
  kindAssessment: ClassifyAssetResult | null;
  recommendedLabel: string | null;
  canConvert: boolean;
  isConverting: boolean;
  assetAudit: AuditAssetResult | null;
  isAuditing: boolean;
  isImproving: boolean;
  hasEditorContent: boolean;
  onOpenFileManager?: () => void;
  onToggleFilesMenu: () => void;
  onRelink?: () => void;
  onRetryCheck?: () => void;
  onUnlink?: () => void;
  onFixDescriptionWithAi: () => void;
  onFixFromHeading: () => void;
  onForkAndFixHeading: () => void;
  onForkAndFixWithAi: () => void;
  onConvertKind: (kind: AssetKind) => void;
  onImproveAsset: () => void;
}

/** Stacked meta cards above the editor: compat fix, provenance, files strip, kind assessment, audit. */
export function AssetInfoStack(props: AssetInfoStackProps) {
  const { selected, nonDirectoryFiles } = props;
  return (
    <div className="grid min-h-0 max-h-72 gap-3 overflow-y-auto">
      {props.blockingCompatIssue ? (
        <AssetCompatBanner
          isFixingDescriptionWithAi={props.isFixingDescriptionWithAi}
          isForkingAndFixingHeading={props.isForkingAndFixingHeading}
          isForkingAndFixingWithAi={props.isForkingAndFixingWithAi}
          isUpstreamSkill={props.isUpstreamSkill}
          issue={props.blockingCompatIssue}
          onFixDescriptionWithAi={props.onFixDescriptionWithAi}
          onFixFromHeading={props.onFixFromHeading}
          onForkAndFixHeading={props.onForkAndFixHeading}
          onForkAndFixWithAi={props.onForkAndFixWithAi}
        />
      ) : null}
      <AssetProvenanceCard
        isRetryingCheck={props.isRetryingCheck}
        isUnlinking={props.isUnlinking}
        isUpstreamSkill={props.isUpstreamSkill}
        kind={selected.kind}
        onRelink={props.onRelink}
        onRetryCheck={props.onRetryCheck}
        onUnlink={props.onUnlink}
        provenance={props.provenance}
        updateAvailable={props.updateAvailable}
        upstreamBrowseUrl={props.upstreamBrowseUrl}
      />
      {selected.kind === 'skills' && nonDirectoryFiles.length > 0 ? (
        <AssetPackageFilesStrip
          fileCount={nonDirectoryFiles.length}
          onOpenFileManager={props.onOpenFileManager}
          onToggleFilesMenu={props.onToggleFilesMenu}
        />
      ) : null}
      {props.kindAssessment ? (
        <AssetKindAssessment
          assessment={props.kindAssessment}
          canConvert={props.canConvert}
          isConverting={props.isConverting}
          isUpstreamSkill={props.isUpstreamSkill}
          onConvert={() => props.onConvertKind(props.kindAssessment!.recommendedKind)}
          recommendedLabel={props.recommendedLabel}
        />
      ) : null}
      {props.assetAudit || props.isAuditing ? (
        <AssetAuditCard
          assetName={selected.name}
          audit={props.assetAudit}
          canImprove={props.hasEditorContent}
          isAuditing={props.isAuditing}
          isImproving={props.isImproving}
          isUpstreamSkill={props.isUpstreamSkill}
          onImprove={props.onImproveAsset}
        />
      ) : null}
    </div>
  );
}
