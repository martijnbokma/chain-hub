import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { librarySkillLink, type SkillNeedingAttention } from '@/lib/learnings';
import { openItemsLabel } from './learnings-meta';
import { useResolveSkill } from './use-resolve-skill';

export function NeedsAttentionCard({ items }: { items: SkillNeedingAttention[] }) {
  const resolve = useResolveSkill();

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>Needs attention</CardTitle>
          <p className="text-xs text-muted-foreground">
            Audit includes these field reports and turns open ones into findings you can apply. Marking addressed
            clears the reports once they are folded into the skill.
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
    </Card>
  );
}
