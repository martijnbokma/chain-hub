import { PreviewCloseButton } from "@/components/layout/PreviewCloseButton"

export function PreviewModalHeader() {
  return (
    <header className="preview-modal__header flex shrink-0 items-center justify-between gap-3 border-b border-hub-border bg-[rgba(11,16,32,0.96)] pt-[max(0.55rem,env(safe-area-inset-top,0px))] pr-[max(0.7rem,env(safe-area-inset-right,0px))] pb-[0.55rem] pl-[max(0.7rem,env(safe-area-inset-left,0px))]">
      <h2
        id="preview-modal-title"
        className="preview-modal__title m-0 font-hub-mono text-[0.78rem] font-semibold tracking-wide text-hub-text-faint uppercase"
      >
        Preview
      </h2>
      <PreviewCloseButton />
    </header>
  )
}
