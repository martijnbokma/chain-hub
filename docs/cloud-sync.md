# Chain Hub Cloud Sync (Pro) — planning notes

Internal planning document for a future **hosted sync** option aimed at **teams** and **developers with multiple devices**. No product commitment or ship date is implied.

## Goals

- Keep `CHAIN_HOME` usable **offline-first**; cloud is an optional layer, not a replacement for the local hub.
- Reduce friction when the same person uses several machines or when a small team shares a curated skill set.

## Scope (to decide)

- **In scope candidates:** `skills/`, `skills-registry.yaml`, `agents/`, `workflows/`, optionally `learnings/` (or a subset).
- **Out of scope by default:** secrets, arbitrary dotfiles, large binary blobs unless explicitly designed for.

## Identity and workspaces

- **Personal Pro:** one user, multiple devices, single logical “vault” or hub snapshot.
- **Team / org:** shared workspace with membership, roles (admin vs member), and audit-friendly activity (later phase).

## Sync model

- **MVP option A — snapshot:** explicit **push / pull / restore** (backup mental model, simpler conflicts).
- **MVP option B — continuous:** background sync with a clear **conflict policy** (e.g. last-write-wins per file, or “conflict copy” sidecars).
- **Later:** selective sync rules, per-skill pins, or branch-like “collections” if demand appears.

## CLI surface (sketch)

- `chain sync login` (or device linking via browser).
- `chain sync status`, `chain sync push`, `chain sync pull` (exact verbs TBD).
- Long-lived credentials: device tokens or refresh tokens; document rotation and revocation.

## Hub UI

- Local hub (`chain hub`) can show **link status**, last sync time, and errors; heavy administration may stay web-only for Pro.

## Security and privacy

- TLS in transit; encryption at rest on the service side.
- Clear data policy: what is stored, retention, export, delete account.
- Optional **client-side encryption** for sensitive skill content if the product promise requires “we can’t read your skills” (adds key recovery complexity).

## Related repo context

- The local dashboard lives in `apps/hub` (Astro static build); packaged into the npm artifact as `dist/hub`. Cloud sync would extend the **CLI + optional backend**, not replace local `CHAIN_HOME` as the source of truth during work.
