/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Sitebehaviour tracking secret (public client bundle; set in host env + local `.env`). */
  readonly PUBLIC_SITEBEHAVIOUR_SECRET?: string;
}
