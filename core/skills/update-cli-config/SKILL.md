---
name: update-cli-config
description: >-
  Route terminal/agent CLI configuration to the correct product and file, then
  edit safely. Covers Cursor CLI (~/.cursor/cli-config.json) in full detail.
  Use when the user asks about CLI permissions, approval mode, vim mode in a
  terminal agent, sandbox, or agent CLI display options — after confirming which
  CLI they use. For GUI editor preferences (themes, format on save), use
  update-editor-settings instead.
metadata:
  surfaces:
    - cli
---
# Agent / terminal CLI configuration

Bundled tools differ: **there is no single global “CLI config” file** across vendors. This skill’s job is to **identify which product the user runs in the terminal**, open the **right** config, and only then apply changes.

## 1. Confirm what they mean

- **Terminal agent / “headless” agent CLI** (permissions, sandbox, model defaults in JSON): this document — pick a row below.
- **IDE / GUI settings** (VS Code–family `settings.json`): use **`update-editor-settings`** — not this skill.
- **They do not use any terminal agent** (only IDE chat, web UI, or another host): **do not** edit `~/.cursor/cli-config.json`. Say that this path is Cursor CLI–specific; offer `update-editor-settings` if they meant the editor, or ask which terminal tool they use if they still want CLI-level controls.

## 2. Where configs usually live (by product)

| Product (terminal) | Typical user-level config | Project overrides (if any) |
|--------------------|---------------------------|----------------------------|
| **Cursor CLI / Cursor Agent** | `~/.cursor/cli-config.json` | `.cursor/cli.json` (merged from repo root toward cwd; deeper wins) |
| **Claude Code** | `~/.claude/settings.json` | `.claude/settings.local.json` (and team/project patterns per Claude Code docs) |
| **Gemini CLI** | `~/.gemini/settings.json` | Per Gemini CLI docs |

If the user **did not name a product**, ask once which terminal CLI they use (Cursor CLI, Claude Code, Gemini CLI, other) **before** writing files.

If they name something **not in the table**, do not invent paths — use that product’s official documentation for config location and schema.

---

## Cursor CLI — `cli-config.json` (detailed reference)

The following applies **only** when the user is on **Cursor CLI** and the target file is **`~/.cursor/cli-config.json`** (plus optional project `.cursor/cli.json` as described above).

### How to modify

Read `~/.cursor/cli-config.json`, apply changes, and write it back. The file is standard JSON. Changes take effect after restarting the CLI.

### Available settings

#### `permissions` (required)

Tool permission rules. Each entry is a string pattern.

- `allow`: string[] — patterns for allowed tool calls (e.g. `"Shell(**)"`, `"Mcp(server-name, tool-name)"`)
- `deny`: string[] — patterns for denied tool calls

#### `editor`

- `vimMode`: boolean — enable vim keybindings in the CLI input
- `defaultBehavior`: `"ide"` | `"agent"` — default behavior mode

#### `display` (optional)

- `showLineNumbers`: boolean (default: false) — show line numbers in code output
- `showThinkingBlocks`: boolean (default: false) — show model thinking/reasoning blocks
- `showStatusIndicators`: boolean (default: false) — show status indicators in the UI

#### `channel` (optional)

Release channel: `"prod"` | `"staging"` | `"lab"` | `"static"`

#### `maxMode` (optional)

boolean (default: false) — enable max mode for higher-quality model responses

#### `approvalMode` (optional)

Controls tool approval behavior:

- `"allowlist"` (default) — require approval for tools not in the allow list
- `"unrestricted"` — auto-approve all tool calls (yolo mode)

#### `sandbox` (optional)

Sandbox execution environment settings:

- `mode`: `"disabled"` | `"enabled"` (default: `"disabled"`)
- `networkAccess`: `"user_config_only"` | `"user_config_with_defaults"` | `"allow_all"` — controls network access from sandbox
- `networkAllowlist`: string[] — domains the sandbox is allowed to reach

#### `network` (optional)

- `useHttp1ForAgent`: boolean (default: false) — use HTTP/1.1 instead of HTTP/2 for agent connections (enables SSE-based streaming)

#### `bedrock` (optional)

AWS Bedrock integration settings:

- `enabled`: boolean (default: false)
- `mode`: `"access-key"` | `"team-role"` (default: `"access-key"`)
- `region`: string — AWS region
- `testModel`: string — model to use for testing
- `teamRoleArn`: string — IAM role ARN for team mode
- `teamExternalId`: string — external ID for STS assume-role

#### `attribution` (optional)

Controls how agent work is attributed in git:

- `attributeCommitsToAgent`: boolean (default: true) — attribute commits to the agent
- `attributePRsToAgent`: boolean (default: true) — attribute PRs to the agent

#### `webFetchDomainAllowlist` (optional)

string[] — domains the web fetch tool is allowed to access (e.g. `"docs.github.com"`, `"*.example.com"`, `"*"`)

### Fields you should NOT modify (Cursor CLI)

These are internal/cached state and should not be edited manually:

- `version` — config schema version
- `model` / `selectedModel` / `modelParameters` / `hasChangedDefaultModel` — managed by the model picker
- `privacyCache` — cached privacy mode state
- `authInfo` — cached authentication info
- `showSandboxIntro` — one-time UI flag
- `conversationClassificationScoredConversations` — internal cache
