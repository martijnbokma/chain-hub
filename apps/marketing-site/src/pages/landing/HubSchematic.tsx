const EDITORS = ['Cursor', 'Claude Code', 'Windsurf', 'Zed'];

/** Blueprint-style diagram: four editors wired into one hub folder. */
export function HubSchematic() {
  const editorY = [40, 146, 252, 358];
  const busX = 340;
  const hubMidY = 234;
  return (
    <svg
      viewBox="0 0 640 440"
      className="w-full h-auto max-w-lg mx-auto"
      role="img"
      aria-label="Diagram: one Chain Hub connecting to Cursor, Claude Code, Windsurf, and Zed"
    >
      {/* trunk + bus */}
      <path
        className="bp-line"
        d={`M180,${hubMidY} H${busX} M${busX},${editorY[0] + 28} V${editorY[3] + 28}`}
        stroke="var(--primary)"
        strokeWidth="2"
        fill="none"
        strokeDasharray={500}
        strokeDashoffset={500}
        style={{ animationDelay: '0ms' }}
      />
      {editorY.map((y, i) => (
        <g key={i}>
          <path
            className="bp-line"
            d={`M${busX},${y + 28} H480`}
            stroke="var(--primary)"
            strokeWidth="2"
            fill="none"
            strokeDasharray={150}
            strokeDashoffset={150}
            style={{ animationDelay: `${400 + i * 100}ms` }}
          />
          <circle cx={busX} cy={y + 28} r="3" fill="var(--primary)" />
          <text
            x={busX + 14}
            y={y + 22}
            className="font-mono"
            fontSize="10"
            fill="var(--muted-foreground)"
            letterSpacing="0.05em"
          >
            {String(i + 1).padStart(2, '0')}
          </text>
          <rect
            className="bp-node"
            x="480"
            y={y}
            width="150"
            height="56"
            rx="3"
            fill="var(--card)"
            stroke="var(--border)"
            strokeWidth="1.5"
            style={{ animationDelay: `${500 + i * 100}ms` }}
          />
          <text
            x="555"
            y={y + 33}
            textAnchor="middle"
            className="font-mono"
            fontSize="12"
            fill="var(--foreground)"
            letterSpacing="0.02em"
          >
            {EDITORS[i].toUpperCase()}
          </text>
        </g>
      ))}

      {/* hub node */}
      <rect
        className="bp-node"
        x="10"
        y="184"
        width="170"
        height="100"
        rx="3"
        fill="var(--card)"
        stroke="var(--primary)"
        strokeWidth="2"
        style={{ animationDelay: '0ms' }}
      />
      <circle cx="180" cy={hubMidY} r="3.5" fill="var(--primary)" />
      <text x="95" y="220" textAnchor="middle" className="font-mono" fontSize="13" fill="var(--foreground)">
        ~/.chain-hub
      </text>
      <text x="95" y="240" textAnchor="middle" className="font-mono" fontSize="8.5" fill="var(--muted-foreground)" letterSpacing="0.03em">
        SKILLS · AGENTS · WORKFLOWS
      </text>
      <text x="95" y="253" textAnchor="middle" className="font-mono" fontSize="8.5" fill="var(--muted-foreground)" letterSpacing="0.03em">
        RULES · MEMORY
      </text>
    </svg>
  );
}
