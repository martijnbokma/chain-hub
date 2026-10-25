# Security Policy

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

Report privately via GitHub's
[private vulnerability reporting](https://github.com/martijnbokma/chain-hub/security/advisories/new)
on this repository, or reach the maintainer through the contact options on their
GitHub profile.

Include where possible: affected version/commit, reproduction steps, impact, and
any suggested mitigation. You can expect an acknowledgement within a few days.

## Scope

Chain Hub is a local-first tool: the hub folder (`~/.chain-hub`) is the only
store, and `system/secrets.json` holds API keys (mode `0600`). Relevant findings
include, for example, secrets written to unexpected locations, path traversal in
skill/asset installs, unsafe editor projection, or catalog entries executed
without review (`hasScripts` handling).

## Supported versions

Only the latest release on `main` receives fixes. The project is pre-1.0
(currently `1.0.0-beta.x`); upgrade to the newest tag before reporting.

## Supply chain

GitHub secret scanning and push protection are enabled on this repository, and
dependency updates are tracked via Dependabot.
