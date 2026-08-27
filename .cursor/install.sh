#!/usr/bin/env bash
# Idempotent bootstrap for the Chain Hub Cloud Agent environment.
# Installs the pinned Bun toolchain, then installs workspace deps and builds
# every package + the dashboard so the CLI and dev servers can run immediately.
set -euo pipefail

BUN_VERSION="1.3.11"
export BUN_INSTALL="$HOME/.bun"

# Install Bun only when the pinned version is missing (keeps re-runs fast).
if ! "$BUN_INSTALL/bin/bun" --version 2>/dev/null | grep -qx "$BUN_VERSION"; then
  curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
fi

export PATH="$BUN_INSTALL/bin:$PATH"

# Expose bun/bunx on the global PATH so every shell and terminal finds them.
if command -v sudo >/dev/null 2>&1; then
  sudo ln -sf "$BUN_INSTALL/bin/bun" /usr/local/bin/bun
  sudo ln -sf "$BUN_INSTALL/bin/bun" /usr/local/bin/bunx
fi

echo "Using bun $(bun --version) and node $(node --version)"

# Install workspace dependencies against the committed lockfile.
bun install --frozen-lockfile

# Build all packages in dependency order plus the hub-web dashboard bundle.
bun run build
