---
name: create-hook
description: >-
  Create agent hooks for Cursor (hooks.json + scripts) or Claude Code
  (settings.json hooks blocks). Use when you want to run custom logic before or
  after agent events, gate or audit tool calls, or automate workflows triggered
  by agent actions.
---
# Creating agent hooks

Hooks let you run custom logic before or after agent events: gate or audit tool calls, rewrite inputs, inject context, or chain follow-up workflows. **Which format and config file depend on the editor** — confirm the target first, then follow the matching section below.

## Choose your editor

| Editor / CLI | Hook config | Jump to |
|---|---|---|
| **Cursor** (IDE or CLI) | `.cursor/hooks.json` or `~/.cursor/hooks.json` | [Cursor hooks](#cursor-hooks) |
| **Claude Code** (CLI) | `.claude/settings.json` or `~/.claude/settings.json` | [Claude Code hooks](#claude-code-hooks) |
| **Windsurf / other** | No standardized hook API yet — check the product's docs | — |

If the user's editor is unclear, ask once before creating any files.

---

## Cursor hooks

**Scope:** Cursor's `hooks.json` hook system. Hooks are scripts or prompt-based checks that exchange JSON over stdin/stdout and can observe, block, modify, or follow up on behavior.

When the user asks for a hook, don't stop at describing the format. Gather the missing requirements, then create or update the hook files directly.

### Gather Requirements

Before you write anything, determine:

1. **Scope**: Should this be a project hook or a user hook?
2. **Trigger**: Which event should run the hook?
3. **Behavior**: Should it audit, deny/allow, rewrite input, inject context, or continue a workflow?
4. **Implementation**: Should it be a command hook (script) or a prompt hook?
5. **Filtering**: Does it need a matcher so it only runs for certain tools, commands, or subagent types?
6. **Safety**: Should failures fail open or fail closed?

Infer these from the conversation when possible. Only ask for the missing pieces.

### Choose the Right Location

- **Project hooks**: `.cursor/hooks.json` and `.cursor/hooks/*`
- **User hooks**: `~/.cursor/hooks.json` and `~/.cursor/hooks/*`

Path behavior matters:

- **Project hooks** run from the project root, so use paths like `.cursor/hooks/my-hook.sh`
- **User hooks** run from `~/.cursor/`, so use paths like `./hooks/my-hook.sh` or `hooks/my-hook.sh`

Prefer **project hooks** when the behavior should be shared with the repository and checked into version control.

### Choose the Hook Event

Use the narrowest event that matches the user's goal.

#### Common Agent events

- `sessionStart`, `sessionEnd`: set up or audit a session
- `preToolUse`, `postToolUse`, `postToolUseFailure`: work across all tools
- `subagentStart`, `subagentStop`: control or continue Task/subagent workflows
- `beforeShellExecution`, `afterShellExecution`: gate or audit terminal commands
- `beforeMCPExecution`, `afterMCPExecution`: gate or audit MCP tool calls
- `beforeReadFile`, `afterFileEdit`: control file reads or post-process edits
- `beforeSubmitPrompt`: validate prompts before they are sent
- `preCompact`: observe context compaction
- `stop`: handle agent completion
- `afterAgentResponse`, `afterAgentThought`: track agent output or reasoning

#### Tab events

- `beforeTabFileRead`: control file access for inline completions
- `afterTabFileEdit`: post-process edits made by Tab

#### Quick event chooser

- **Block or approve shell commands** -> `beforeShellExecution`
- **Audit shell output** -> `afterShellExecution`
- **Format files after edits** -> `afterFileEdit`
- **Block or rewrite a specific tool call** -> `preToolUse`
- **Add follow-up context after a tool succeeds** -> `postToolUse`
- **Control whether subagents can run** -> `subagentStart`
- **Chain Hub subagent loops** -> `subagentStop`
- **Check prompts for secrets or policy violations** -> `beforeSubmitPrompt`
- **Protect MCP calls** -> `beforeMCPExecution`

### Hooks File Format

Create a `hooks.json` file with schema version 1:

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      {
        "command": ".cursor/hooks/format.sh"
      }
    ]
  }
}
```

Each hook definition can include:

- `command`: shell command or script path
- `type`: `"command"` or `"prompt"` (defaults to `"command"`)
- `timeout`: timeout in seconds
- `matcher`: filter for when the hook runs
- `failClosed`: block the action when the hook crashes, times out, or returns invalid JSON
- `loop_limit`: mainly for `stop` and `subagentStop` follow-up loops

### Matchers

Use matchers to avoid running the hook on every event.

- `preToolUse` / `postToolUse` / `postToolUseFailure`: match on tool type such as `Shell`, `Read`, `Write`, `Task`, or MCP tools in `MCP: ...` form
- `subagentStart` / `subagentStop`: match on subagent type such as `generalPurpose`, `explore`, or `shell`
- `beforeShellExecution` / `afterShellExecution`: match on the full shell command string
- `beforeReadFile`: match on tool type such as `Read` or `TabRead`
- `afterFileEdit`: match on tool type such as `Write` or `TabWrite`
- `beforeSubmitPrompt`: matches the value `UserPromptSubmit`

Important matcher warning:

- Matchers use JavaScript-style regular expressions, not POSIX/grep syntax
- Do not use POSIX classes like `[[:space:]]`; use JavaScript equivalents like `\s`
- If the matcher is at all tricky, start by getting the hook working without one or with a very simple matcher, then tighten it after the hook is confirmed to load and fire

### Command Hooks

Command hooks are the default. They receive JSON on stdin and can return JSON on stdout.

Before using a command hook, verify that every executable it depends on will actually run in the hook environment:

- the script itself has a valid shebang and is executable
- any helper binary it calls is already installed and on `$PATH`
- if the script depends on tools like `jq`, `python3`, `node`, or repo-local CLIs, verify that explicitly before finishing

Do not assume a binary exists just because it is common on your machine.

#### Minimal project-level example

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      {
        "command": ".cursor/hooks/approve-network.sh",
        "matcher": "curl|wget|nc ",
        "failClosed": true
      }
    ]
  }
}
```

```bash
#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.command // empty')

if [[ "$command" =~ curl|wget|nc ]]; then
  echo '{
    "permission": "ask",
    "user_message": "This command may make a network request. Please review it before continuing.",
    "agent_message": "A hook flagged this shell command as a possible network call."
  }'
  exit 0
fi

echo '{ "permission": "allow" }'
exit 0
```

Important behavior:

- Exit code `0`: success
- Exit code `2`: block the action, same as returning deny
- Other non-zero exit codes: fail open by default unless `failClosed: true`

Always make hook scripts executable after creating them.

### Prompt Hooks

Prompt hooks are useful when the policy is easier to describe than to script.

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      {
        "type": "prompt",
        "prompt": "Does this command look safe to execute? Only allow read-only operations. Here is the hook input: $ARGUMENTS",
        "timeout": 10
      }
    ]
  }
}
```

Use prompt hooks for lightweight policy decisions. Prefer command hooks when the logic must be deterministic or when the user needs exact, auditable behavior.

### Event Output Cheat Sheet

Use the event's supported output fields only.

- `preToolUse`: can return `permission`, `user_message`, `agent_message`, and `updated_input`
- `postToolUse`: can return `additional_context`; for MCP tools it can also return `updated_mcp_tool_output`
- `subagentStart`: can return `permission` and `user_message`
- `subagentStop`: can return `followup_message`
- `beforeShellExecution` / `beforeMCPExecution`: can return `permission`, `user_message`, and `agent_message`

When the user wants to rewrite a tool call, prefer `preToolUse`. When they want to gate only shell commands, prefer `beforeShellExecution`.

### Implementation Workflow (Cursor)

1. Pick the correct location and event
2. Create or update the correct `hooks.json` file
3. Start with no matcher or the simplest safe matcher
4. Create the script under the matching hooks directory
5. Read stdin JSON and implement the required behavior
6. Make the script executable
7. Verify any helper executables the script uses are installed and on `$PATH`
8. Trigger the relevant action to test the hook
9. Verify behavior in Cursor's **Hooks** settings tab or the **Hooks** output channel

If you are editing an existing hooks setup, preserve unrelated hooks and only change the minimum necessary entries.

### Validation and Troubleshooting (Cursor)

- Cursor watches `hooks.json` and reloads on save
- If hooks still do not load, restart Cursor
- Double-check relative paths:
  - project hooks -> relative to the project root
  - user hooks -> relative to `~/.cursor/`
- If the hook does not appear to load at all, suspect matcher/config parsing first; remove the matcher and confirm the base hook works before tightening it
- If the script runs external commands, verify each one is installed and reachable from the hook process with `command -v` or equivalent
- If the hook should block on failure, set `failClosed: true`
- If a command hook should intentionally block, returning exit code `2` is valid

---

## Claude Code hooks

**Scope:** Claude Code's hook system configured in `settings.json`. Hooks run shell commands at defined lifecycle events. They receive context on stdin and can block, approve, or inject feedback.

### Configuration location

| Scope | Path |
|---|---|
| Project (checked into repo) | `.claude/settings.json` |
| User (all projects) | `~/.claude/settings.json` |

Prefer **project-level** when the hook enforces team conventions. Use **user-level** for personal preferences or cross-project policies.

### Settings format

Add a `hooks` key to `settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/check-command.sh"
          }
        ]
      }
    ]
  }
}
```

Each entry under a hook type is a **matcher group**: a `matcher` regex and an array of `hooks` to run when it matches.

### Hook event types

| Event | When it fires | Can block? |
|---|---|---|
| `PreToolUse` | Before any tool call | Yes — return `{"decision": "block", "reason": "..."}` |
| `PostToolUse` | After a tool call completes | No — informational only |
| `Notification` | When Claude sends a notification | No |
| `Stop` | When the main agent finishes | No |
| `SubagentStop` | When a subagent finishes | No |

### Matchers

`matcher` is a regex matched against the tool name (e.g. `"Bash"`, `"Write"`, `"Read"`, `"Edit"`). An empty string or omitted matcher matches all tools.

```json
{ "matcher": "Bash" }           // only shell commands
{ "matcher": "Write|Edit" }     // file writes and edits
{ "matcher": "" }               // all tools
```

### Stdin payload

Each hook receives a JSON object on stdin:

```json
{
  "session_id": "abc123",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test"
  }
}
```

For `PostToolUse`, the payload also includes:

```json
{
  "tool_response": {
    "output": "...",
    "is_error": false
  }
}
```

### Return values

**PreToolUse — approve:**
```bash
echo '{"decision": "approve"}'
# or simply exit 0 with no output
```

**PreToolUse — block:**
```bash
echo '{"decision": "block", "reason": "Network calls are not allowed in this project."}'
exit 0
```

**PreToolUse — ask the user:**
```bash
echo '{"decision": "ask", "user_message": "This command touches production. Continue?"}'
exit 0
```

**PostToolUse — inject context:**
```bash
echo '{"output": "Lint passed. No issues found."}'
```

Non-zero exit codes block the action regardless of stdout content.

### Minimal example — audit shell commands

`.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/audit-shell.sh"
          }
        ]
      }
    ]
  }
}
```

`.claude/hooks/audit-shell.sh`:

```bash
#!/bin/bash
input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')

if [[ "$cmd" =~ (curl|wget|ssh|scp) ]]; then
  echo "{\"decision\": \"block\", \"reason\": \"Network commands require manual approval: $cmd\"}"
  exit 0
fi

echo '{"decision": "approve"}'
exit 0
```

Make it executable: `chmod +x .claude/hooks/audit-shell.sh`

### Post-edit formatting example

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/format.sh"
          }
        ]
      }
    ]
  }
}
```

`.claude/hooks/format.sh`:

```bash
#!/bin/bash
input=$(cat)
file=$(echo "$input" | jq -r '.tool_input.path // empty')

if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
  npx prettier --write "$file" 2>/dev/null
fi
exit 0
```

### Implementation workflow (Claude Code)

1. Choose project-level (`.claude/`) or user-level (`~/.claude/`)
2. Add or update the `hooks` key in `settings.json`
3. Write the hook script; give it a shebang and make it executable
4. Verify dependencies (`jq`, linters, etc.) are on `$PATH`
5. Trigger the relevant action manually to test
6. Check Claude Code output for hook errors

### Validation and Troubleshooting (Claude Code)

- Claude Code reads `settings.json` at startup — restart the CLI after changes
- Hook scripts must be executable (`chmod +x`)
- Use `echo '...' | your-script.sh` with mock JSON to test scripts without the agent
- If the hook should fail closed on error, exit with a non-zero code and return a block decision

---

## Final Checklist

- [ ] Confirmed which editor the user is targeting (Cursor vs Claude Code)
- [ ] Used the correct config file and path style for that editor
- [ ] Chose the narrowest event that covers the goal
- [ ] Added a matcher when appropriate (regex, not POSIX)
- [ ] Returned only output fields supported by that hook event
- [ ] Made scripts executable
- [ ] Verified helper binaries exist on `$PATH`
- [ ] Tested by triggering the real event
