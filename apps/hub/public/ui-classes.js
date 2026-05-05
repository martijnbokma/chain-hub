/** Shared Tailwind utility strings for the hub UI (v4 @theme tokens: hub-*). */

export const pageHeader =
  "mb-[0.86rem] flex items-center justify-between max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-[0.6rem]"

export const pageTitle = "m-0 font-hub-display text-[1.05rem] tracking-wide text-[#f5f8ff]"

export const sectionLabel =
  "sticky top-3 z-[2] my-[0.85rem] mb-[0.45rem] mt-[0.85rem] border border-hub-border bg-[rgba(8,13,24,0.94)] px-2 py-[0.35rem] text-[0.68rem] tracking-wide text-hub-text-faint uppercase"

export const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-accent"

export const btn = `cursor-pointer rounded-[5px] border border-hub-border-strong bg-[color-mix(in_oklab,var(--color-hub-surface-2)_90%,transparent)] px-[0.72rem] py-[0.42rem] font-inherit text-[0.75rem] text-[#f3f6ff] transition-[filter,border-color,background-color] duration-[120ms] ease-in-out hover:brightness-110 ${focusRing} disabled:cursor-not-allowed disabled:opacity-55 disabled:brightness-100 max-[640px]:w-full max-[640px]:justify-center`

export const btnPrimary = `${btn} border-[color-mix(in_oklab,var(--color-hub-accent)_68%,var(--color-hub-border-strong))] text-hub-accent`

export const btnInstalled = `${btn} border-[color-mix(in_oklab,var(--color-hub-user)_52%,var(--color-hub-border-strong))] cursor-default text-hub-user`

export const btnWarn = `${btn} border-[color-mix(in_oklab,var(--color-hub-warn)_55%,var(--color-hub-border-strong))] text-hub-warn`

export const btnDanger = `${btn} border-[color-mix(in_oklab,var(--color-hub-err)_55%,var(--color-hub-border-strong))] text-hub-err`

export const btnDetailHeader = `${btn} max-[640px]:!w-auto`

export const msgBase =
  "mt-[0.6rem] rounded-md border border-hub-border bg-[color-mix(in_oklab,var(--color-hub-surface-2)_70%,transparent)] px-[0.68rem] py-[0.56rem] text-[0.75rem]"

export const msgOk = `${msgBase} border-[color-mix(in_oklab,var(--color-hub-user)_44%,var(--color-hub-border))] text-hub-user`

export const msgErr = `${msgBase} border-[color-mix(in_oklab,var(--color-hub-err)_44%,var(--color-hub-border))] text-hub-err`

export const msgWarn = `${msgBase} border-[color-mix(in_oklab,var(--color-hub-warn)_44%,var(--color-hub-border))] bg-[color-mix(in_oklab,var(--color-hub-warn)_10%,var(--color-hub-surface-2))] text-[#f8dcb0]`

export const msgWarnText = `${msgBase} text-[#f8dcb0]`

export function msgClassForKind(kind) {
  if (kind === "ok") return msgOk
  if (kind === "err") return msgErr
  if (kind === "warn") return msgWarn
  if (kind === "warn-text") return `${msgBase} text-hub-warn`
  return msgBase
}
