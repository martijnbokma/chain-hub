const EDITORS = ['Claude Code', 'Cursor', 'Devin CLI', 'Windsurf', 'Zed', 'Antigravity'];

const FG = 'var(--foreground)';
const MUTED = 'var(--muted-foreground)';
const ACC = 'var(--primary)';

/** Brand mark paths (64x64): open arc + spoke + center dot + signal dot. */
function MarkPaths({ ink, accent }: { ink: string; accent: string }) {
  return (
    <>
      <path
        d="M46.14 17.86A20 20 0 1 0 46.14 46.14"
        fill="none"
        stroke={ink}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line x1="32" y1="32" x2="51" y2="32" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="32" r="7" fill={ink} />
      <circle cx="55" cy="32" r="5" fill={accent} />
    </>
  );
}

/**
 * Framed-sheet diagram: the hub mark left of center, six curved signal lines
 * flowing out to circular editor nodes — the dashed flow animation makes each
 * wire read as a live signal, not a static tree.
 */
export function HubSchematic() {
  const W = 640;
  const H = 460;
  const cx = 128;
  const cy = 230;
  const sx = cx + 56;
  const nx = 468;
  const ys = [58, 128, 198, 268, 338, 408];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto max-w-xl mx-auto"
      role="img"
      aria-label="Diagram: one Chain Hub linked into Claude Code, Cursor, Devin CLI, Windsurf, Zed, and Antigravity"
    >
      {/* drawing sheet */}
      <rect x="1" y="1" width={W - 2} height={H - 2} fill="var(--card)" stroke="var(--frame)" strokeWidth="1.5" />
      <text x="20" y="32" className="font-mono" fontSize="11" letterSpacing="1.2" fill={MUTED}>
        SHEET 1/1 · LOCAL-FIRST
      </text>
      <text x={W - 20} y="32" textAnchor="end" className="font-mono" fontSize="11" letterSpacing="1.2" fill={MUTED}>
        SCALE 1:1
      </text>
      <text x="20" y={H - 18} className="font-mono" fontSize="11" letterSpacing="1.2" fill={MUTED}>
        ONE HUB · STILL ONE COPY
      </text>

      {/* signal wires: faint guide + flowing dashes */}
      {ys.map((y, i) => {
        const d = `M${sx} ${cy}C${sx + 110} ${cy} ${nx - 130} ${y} ${nx - 14} ${y}`;
        return (
          <g key={EDITORS[i]}>
            <path d={d} fill="none" stroke={FG} strokeOpacity="0.18" strokeWidth="2" />
            <path
              className="bp-flow"
              style={{ animationDelay: `${-i * 0.4}s` }}
              d={d}
              fill="none"
              stroke={ACC}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx={nx} cy={y} r="10" fill="var(--card)" stroke={FG} strokeWidth="2" />
            <circle className="bp-pulse" style={{ animationDelay: `${i * 0.5}s` }} cx={nx} cy={y} r="4" fill={ACC} />
            <text x={nx + 24} y={y + 5} className="font-display" fontSize="15" fontWeight="600" fill={FG}>
              {EDITORS[i]}
            </text>
          </g>
        );
      })}

      {/* hub mark + path */}
      <g transform={`translate(${cx - 51} ${cy - 51}) scale(1.6)`}>
        <MarkPaths ink={FG} accent={ACC} />
      </g>
      <text x={cx} y={cy + 78} textAnchor="middle" className="font-mono" fontSize="13" fill={FG}>
        ~/.chain-hub
      </text>
      <text x={cx} y={cy + 94} textAnchor="middle" className="font-mono" fontSize="8.5" letterSpacing="0.8" fill={MUTED}>
        SKILLS · AGENTS · WORKFLOWS
      </text>
      <text x={cx} y={cy + 107} textAnchor="middle" className="font-mono" fontSize="8.5" letterSpacing="0.8" fill={MUTED}>
        RULES · PROMPTS
      </text>
    </svg>
  );
}
