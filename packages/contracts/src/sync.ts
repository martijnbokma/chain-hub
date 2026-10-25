import { z } from "zod";

/**
 * Cloud backup/sync contracts. The hub folder itself is the git worktree;
 * `system/sync.json` syncs to the remote while `system/sync-state.json` and
 * `system/secrets.json` stay machine-local (see .gitignore + denylist).
 */

export const syncProviderSchema = z.enum(["github"]);

export const syncRemoteSchema = z.object({
  provider: syncProviderSchema,
  /** Clone URL, e.g. https://github.com/owner/chain-hub-sync.git */
  url: z.string().min(1),
  /** "owner/name" */
  repo: z.string().min(1)
});

/** system/sync.json — synced, so a second machine inherits the connection. */
export const syncConfigSchema = z.object({
  version: z.literal(1),
  remote: syncRemoteSchema.nullable().default(null),
  enabled: z.boolean().default(false),
  autoSync: z.boolean().default(true)
});

/** system/sync-state.json — gitignored, per-machine. */
export const syncStateSchema = z.object({
  version: z.literal(1),
  machineId: z.string().default(""),
  lastSyncAt: z.string().nullable().default(null),
  lastSyncSha: z.string().nullable().default(null),
  lastSyncError: z.string().nullable().default(null),
  pendingConflict: z
    .object({
      startedAt: z.string(),
      files: z.array(z.string())
    })
    .nullable()
    .default(null),
  /** How this machine authenticates — machine-specific, lives in state not config. */
  authMethod: z.enum(["gh", "pat"]).nullable().default(null)
});

export const syncAuthMethodSchema = z.enum(["gh", "pat"]);

/** Public status — never includes the stored token. */
export const syncStatusSchema = z.object({
  connected: z.boolean(),
  enabled: z.boolean(),
  autoSync: z.boolean(),
  remote: syncRemoteSchema.nullable(),
  authMethod: syncAuthMethodSchema.nullable(),
  machineId: z.string(),
  lastSyncAt: z.string().nullable(),
  lastSyncError: z.string().nullable(),
  uncommitted: z.number().int().nonnegative(),
  ahead: z.number().int().nonnegative(),
  behind: z.number().int().nonnegative(),
  conflicts: z.array(z.object({ path: z.string() }))
});

export const syncConnectInputSchema = z.object({
  /** Repo name; default "chain-hub-sync". */
  repo: z
    .string()
    .regex(/^[\w.-]+$/, "Repo name may only contain letters, digits, '-', '_' and '.'")
    .optional(),
  method: syncAuthMethodSchema,
  /** Required when method = "pat". */
  token: z.string().optional(),
  /** Take over an existing repo that lacks the chain-hub.json manifest. */
  adopt: z.boolean().optional(),
  autoSync: z.boolean().optional()
});

export const resolveConflictsInputSchema = z.object({
  resolutions: z
    .array(
      z.object({
        path: z.string().min(1),
        /** "manual" = user already edited the file; --done commits the merge. */
        strategy: z.enum(["local", "remote", "manual"])
      })
    )
    .min(1)
});

export type SyncProvider = z.infer<typeof syncProviderSchema>;
export type SyncRemote = z.infer<typeof syncRemoteSchema>;
export type SyncConfig = z.infer<typeof syncConfigSchema>;
export type SyncState = z.infer<typeof syncStateSchema>;
export type SyncAuthMethod = z.infer<typeof syncAuthMethodSchema>;
export type SyncStatus = z.infer<typeof syncStatusSchema>;
export type SyncConnectInput = z.infer<typeof syncConnectInputSchema>;
export type ResolveConflictsInput = z.infer<typeof resolveConflictsInputSchema>;
