import type { EditorAdapter } from "./types.js";
import { agentSkillsAdapter } from "./agent-skills.js";
import { antigravityAdapter } from "./antigravity.js";
import { claudeCodeAdapter } from "./claude-code.js";
import { codexAdapter } from "./codex.js";
import { cursorAdapter } from "./cursor.js";
import { devinAdapter } from "./devin.js";
import { windsurfAdapter } from "./windsurf.js";
import { zedAdapter } from "./zed.js";

export * from "./types.js";
export * from "./frontmatter.js";
export * from "./marker.js";

export const EDITOR_ADAPTERS: EditorAdapter[] = [claudeCodeAdapter, cursorAdapter, codexAdapter, devinAdapter, windsurfAdapter, agentSkillsAdapter, zedAdapter, antigravityAdapter];
