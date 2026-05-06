import { Card } from "@/components/ui/card"

export function StatusPanels() {
  return (
    <>
      <Card
        id="chain-home-bar"
        className="mb-[0.85rem] shrink-0 rounded-none border-hub-border bg-[rgba(16,24,44,0.72)] px-[0.74rem] py-[0.6rem] text-[0.78rem] text-hub-text-dim shadow-none"
        aria-live="polite"
      />
      <Card
        id="global-banner"
        className="mb-[0.9rem] hidden shrink-0 rounded-none border-[color-mix(in_oklab,var(--color-hub-warn)_50%,transparent)] bg-[color-mix(in_oklab,var(--color-hub-warn)_12%,transparent)] px-[0.8rem] py-[0.65rem] text-[0.79rem] text-[#ffe3b3] shadow-none"
        role="status"
      />
    </>
  )
}
