import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { librarySkillLink, type SkillNeedingAttention } from '@/lib/learnings';
import type { FoldLearningsResult } from '@/types';
import { FoldPreviewDialog } from './FoldPreviewDialog';
import { openItemsLabel } from './learnings-meta';
import { useFoldLearnings } from './use-fold-learnings';
import { useResolveSkill } from './use-resolve-skill';

export function NeedsAttentionCard({ items }: { items: SkillNeedingAttention[] }) {
  const resolve = useResolveSkill();
  const fold = useFoldLearnings();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<FoldLearningsResult | null>(null);
  const [doneSkills, setDoneSkills] = useState<ReadonlySet<string>>(new Set());

  const startPreview = () => {
    fold.preview.mutate(undefined, {
      onSuccess: (result) => {
        setPreview(result);
        setDoneSkills(new Set());
        setPreviewOpen(true);
      }
    });
  };

  const applySkill = (skill: string) => {
    fold.apply.mutate(
      { skill },
      { onSuccess: () => setDoneSkills((prev) => new Set(prev).add(skill)) }
    );
  };

  const applyAll = () => {
    fold.apply.mutate({}, { onSuccess: () => setPreviewOpen(false) });
  };

  const markAddressed = (skill: string) => {
    resolve.mutate(skill, { onSuccess: () => setDoneSkills((prev) => new Set(prev).add(skill)) });
  };

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Needs attention</CardTitle>
            <Button loading={fold.preview.isPending} onClick={startPreview} size="sm" variant="secondary">
              Fold into skills
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Fold into skills previews the audit findings and proposed rewrite per skill before anything is
            written; apply folds the reports into the skill itself. Marking addressed clears the reports
            without changes.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {items.map((item) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              key={item.skill}
            >
              <div className="grid min-w-0 gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{item.skill}</span>
                  <Badge variant="warning">{openItemsLabel(item)}</Badge>
                </div>
                {item.latestIssue ? (
                  <p className="text-xs leading-5 text-pretty text-muted-foreground">{item.latestIssue.summary}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.inHub ? (
                  <Link
                    className={buttonVariants({ size: 'sm', variant: 'secondary' })}
                    to={librarySkillLink(item.skill, { audit: true })}
                  >
                    Audit skill
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">Not in your hub</span>
                )}
                <Button
                  disabled={resolve.isPending}
                  loading={resolve.isPending && resolve.variables === item.skill}
                  onClick={() => resolve.mutate(item.skill)}
                  size="sm"
                  variant="ghost"
                >
                  Mark addressed
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      <FoldPreviewDialog
        applying={fold.apply.isPending}
        doneSkills={doneSkills}
        onApplyAll={applyAll}
        onApplySkill={applySkill}
        onMarkAddressed={markAddressed}
        onOpenChange={setPreviewOpen}
        open={previewOpen}
        preview={preview}
      />
    </Card>
  );
}
