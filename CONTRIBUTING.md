# Contributing to Chain Hub

Thanks for your interest in contributing. Chain Hub is a local-first AI workspace
control plane: one hub folder, one CLI, one dashboard, synced into your editors.

## Development setup

Requirements: **Bun 1.3+** and **Node ≥ 22.13**.

```bash
git clone https://github.com/martijnbokma/chain-hub.git
cd chain-hub
bun install
```

## Everyday commands

```bash
bun run dev          # server + hub-web + packages (watch mode)
bun run dev:hub      # fastest dashboard loop
bun run build        # all packages, dependency order
bun run lint         # ESLint 9 flat config, whole workspace
bun run typecheck
bun run test         # all Vitest suites
bun run test:e2e     # Playwright (hub-web)
```

Scoped while iterating:

```bash
bunx turbo run test --filter=@chain-hub/storage
cd packages/storage && bunx vitest run src/skill-install.test.ts
```

## Ground rules

- **Architecture**: dependency direction is `contracts ← storage ← domain ← server/cli`;
  `hub-web` only consumes contracts + the HTTP API. Only `packages/storage` may read
  or write the hub folder.
- **API changes**: update the Zod schema in `packages/contracts/src/` first.
- **Tests**: colocate `*.test.ts(x)` next to source; new functionality needs tests.
- **TypeScript**: strict, no `any`, named exports, ESM only. Comments in English.
- **Frontend**: use the shadcn/ui primitives and Tailwind semantic tokens in
  `apps/hub-web` — don't hand-roll new primitives if one exists.
- **Commits**: Conventional Commits with a package scope, one topic per commit —
  e.g. `feat(storage): add catalog source refresh`. Scopes: `hub-web`, `docs`,
  `cli`, `server`, `domain`, `storage`, `contracts`.
- **Never**: commit secrets or `.env`, add a database/index store, or change a
  public API contract without discussion.

## Pull requests

1. Branch from `develop` and open a PR against `develop`.
2. Make sure `bun run lint`, `bun run typecheck` and `bun run test` pass — CI runs
   build → lint → typecheck → test:coverage → e2e.
3. `main` is release-only and protected; releases are cut by fast-forwarding
   `develop` into `main`.

## Reporting issues

Use GitHub Issues for bugs and feature requests. For security issues see
[SECURITY.md](SECURITY.md) — do not file a public issue.
