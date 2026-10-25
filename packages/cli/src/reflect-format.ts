import type { ReflectionReport } from "@chain-hub/contracts";

const TREND_ICONS: Record<string, string> = {
  improving: "↑",
  struggling: "↓",
  stable: "→",
  new: "★",
  collecting: "•"
};

export function formatReflectionReport(report: ReflectionReport): string[] {
  const lines: string[] = [];
  lines.push(`\nReflection report — ${new Date(report.generatedAt).toLocaleString()}`);
  lines.push(`${report.totalEvents} events across ${report.totalSkills} skills\n`);

  if (report.skills.length === 0) {
    lines.push("No events captured yet. Run: chain capture --event note --skill <slug> --summary <text>");
    return lines;
  }

  for (const skill of report.skills) {
    const trendIcon = TREND_ICONS[skill.trend] ?? "?";
    lines.push(`  ${trendIcon} ${skill.skill}  [${skill.trend}]`);
    lines.push(
      `    ${skill.totalEvents} events: ${skill.successCount} success / ${skill.failureCount} failure / ${skill.correctionCount} correction / ${skill.noteCount} note`
    );
    for (const e of skill.recentEvents) {
      const ts = new Date(e.capturedAt).toLocaleDateString();
      lines.push(`    · [${e.type}] ${e.summary}  (${ts})`);
    }
    lines.push("");
  }

  return lines;
}
