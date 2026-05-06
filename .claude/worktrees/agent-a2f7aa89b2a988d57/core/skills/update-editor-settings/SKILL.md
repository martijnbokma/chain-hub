---
name: update-editor-settings
description: >-
  Modify editor settings for VS Code–family editors (settings.json: VS Code,
  Cursor, VSCodium) or get guidance for JetBrains, Zed, and Neovim. Use when
  the user wants to change editor settings, preferences, themes, font size, tab
  size, format on save, auto save, keybindings, or language-specific options.
metadata:
  surfaces:
    - ide
---
# Updating editor settings

## Choose your editor

Different editors store settings in different formats and locations. Pick the row that matches what the user uses.

| Editor | Config format | Jump to |
|---|---|---|
| **VS Code**, **Cursor**, **VSCodium** | `User/settings.json` (JSON with comments) | [VS Code family](#vs-code-family) below |
| **JetBrains** (IntelliJ, WebStorm, PyCharm…) | `.idea/` XML files + IDE Settings UI | Use **Settings → Appearance & Behavior** or edit `.idea/*.xml`; keys differ per product |
| **Zed** | `~/.config/zed/settings.json` (JSONC) | Edit that file directly; see Zed's settings reference for available keys |
| **Neovim** | `~/.config/nvim/init.lua` or `init.vim` | Lua or VimScript config; plugin-managed settings vary per plugin |
| **Windsurf** | VS Code–compatible `settings.json` | Same as VS Code family below |
| **Emacs** | `~/.emacs.d/init.el` or `~/.emacs` | Elisp config; consult Emacs docs or the user's existing config |

If the user's editor is unclear, **ask once** before editing anything.

---

## VS Code family

This skill covers **VS Code–compatible** editors that use `User/settings.json` with the same schema: **Visual Studio Code**, **Cursor**, **VSCodium**, and forks that keep the same layout. AI-specific keys (for example `cursor.*`) apply only where that product is installed.

## Settings file location

Pick the **product data directory** for the editor the user actually uses, then open `User/settings.json` inside it.

| Product | macOS | Linux | Windows |
|---------|-------|-------|---------|
| **Cursor** | `~/Library/Application Support/Cursor/User/settings.json` | `~/.config/Cursor/User/settings.json` | `%APPDATA%\Cursor\User\settings.json` |
| **VS Code** | `~/Library/Application Support/Code/User/settings.json` | `~/.config/Code/User/settings.json` | `%APPDATA%\Code\User\settings.json` |
| **VSCodium** | `~/Library/Application Support/VSCodium/User/settings.json` | `~/.config/VSCodium/User/settings.json` | `%APPDATA%\VSCodium\User\settings.json` |

If the user did not name a product, **ask once** which editor they use, or infer from an open path / workspace (for example paths containing `Cursor` vs `Code`).

**Not covered here:** JetBrains IDEs, Xcode, Zed, Neovim, Emacs, and terminal-only CLIs — each has its own config files and UI.

## Before modifying settings

1. **Read the existing settings file** for the chosen product path.
2. **Preserve existing settings** — only add or change what the user requested.
3. **Validate JSON** (with comments where supported) before writing.

## Modifying settings

### Step 1: Read current settings

Use the Read tool on the full path for the user's OS and editor (see table above).

### Step 2: Identify the setting to change

Common categories:

- **Editor**: `editor.fontSize`, `editor.tabSize`, `editor.wordWrap`, `editor.formatOnSave`
- **Workbench**: `workbench.colorTheme`, `workbench.iconTheme`, `workbench.sideBar.location`
- **Files**: `files.autoSave`, `files.exclude`, `files.associations`
- **Terminal**: `terminal.integrated.fontSize`, `terminal.integrated.shell.*`
- **Cursor-only** (ignored or inert in plain VS Code): keys prefixed with `cursor.` or `aipopup.`

### Step 3: Write back

1. Parse existing JSON (VS Code settings allow `//` and `/* */` comments — preserve them when practical).
2. Merge the requested keys; leave everything else unchanged.
3. Use consistent indentation (2 spaces is typical).

### Examples

Font size:

```json
{
  "editor.fontSize": 16
}
```

Format on save:

```json
{
  "editor.formatOnSave": true
}
```

Theme:

```json
{
  "workbench.colorTheme": "Default Dark Modern"
}
```

## Important notes

1. **JSON with Comments**: When reading, tolerate comments. When writing, avoid stripping comments unless you are replacing the whole file intentionally.

2. **Reload**: Many keys apply after **Reload Window**; some need a full app restart. Say which you expect.

3. **Workspace vs user**: This skill targets **user** settings. **Workspace** overrides live in `.vscode/settings.json` in the repo.

4. **Commit attribution (Cursor)**: If the user asks about **git attribution for the agent**, that may be the **Cursor CLI** (`~/.cursor/cli-config.json`) or **Cursor Settings → Agent → Attribution** in the IDE — not always `settings.json`. For **Claude Code** or other agents, use their own settings docs instead.

## Common requests → settings

| User request | Setting |
|--------------|---------|
| "bigger/smaller font" | `editor.fontSize` |
| "change tab size" | `editor.tabSize` |
| "format on save" | `editor.formatOnSave` |
| "word wrap" | `editor.wordWrap` |
| "change theme" | `workbench.colorTheme` |
| "hide minimap" | `editor.minimap.enabled` |
| "auto save" | `files.autoSave` |
| "line numbers" | `editor.lineNumbers` |
| "bracket colorization" | `editor.bracketPairColorization.enabled` |
| "cursor style" (caret) | `editor.cursorStyle` |
| "smooth scrolling" | `editor.smoothScrolling` |

## Workflow

1. Resolve **which product** (Cursor vs Code vs VSCodium) and the correct path from the table.
2. Read that `settings.json`.
3. Merge the requested change(s).
4. Write the file back.
5. Tell the user whether to reload the window or restart the app.
