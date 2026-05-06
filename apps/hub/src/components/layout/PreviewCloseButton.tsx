import { X } from "lucide-react"

import { Button } from "@/components/ui/button"

export function PreviewCloseButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className="preview-modal__close inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border-[color-mix(in_oklab,var(--color-hub-accent)_62%,var(--color-hub-border-strong))] bg-[color-mix(in_oklab,var(--color-hub-surface-2)_88%,transparent)] p-0 text-hub-accent shadow-[0_10px_26px_rgba(2,4,10,0.42)] backdrop-blur-[1.5px] transition-[transform,filter,border-color,background-color] duration-[140ms] ease-out hover:-translate-y-px hover:brightness-110 focus-visible:outline-hub-accent disabled:cursor-not-allowed disabled:opacity-55 disabled:brightness-100"
      aria-label="Close preview"
      title="Close preview"
      data-toolbar-tooltip="Close preview"
    >
      <X className="size-[17px]" strokeWidth={1.85} aria-hidden="true" />
    </Button>
  )
}
