import type { EditorAdapter } from "./types.js";
import { antigravityAdapter } from "./antigravity.js";
import { claudeCodeAdapter } from "./claude-code.js";
import { cursorAdapter } from "./cursor.js";
import { windsurfAdapter } from "./windsurf.js";
import { zedAdapter } from "./zed.js";

export * from "./types.js";
export * from "./frontmatter.js";
export * from "./marker.js";

export const EDITOR_ADAPTERS: EditorAdapter[] = [claudeCodeAdapter, cursorAdapter, windsurfAdapter, zedAdapter, antigravityAdapter];
