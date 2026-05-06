import { PreviewModalHeader } from "@/components/layout/PreviewModalHeader"

export function PreviewModalShell() {
  return (
    <div
      id="preview-modal-root"
      className="preview-modal fixed inset-0 z-[45] m-0 flex hidden flex-col p-0"
      aria-hidden="true"
    >
      <button
        type="button"
        className="preview-modal__backdrop absolute inset-0 z-0 m-0 cursor-pointer border-0 bg-[rgba(0,0,0,0.55)] p-0"
        aria-label="Close preview"
      />
      <div
        className="preview-modal__panel relative z-[1] flex min-h-0 w-full flex-1 flex-col border-none bg-[#0a1020] shadow-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-modal-title"
      >
        <PreviewModalHeader />
        <div className="preview-modal__body preview min-h-0 flex-1 overflow-y-auto px-[max(0.75rem,env(safe-area-inset-left,0px))] pt-[0.75rem] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))]" />
        <button type="button" className="preview-modal__focus-close hidden" aria-label="Close focus mode" />
      </div>
    </div>
  )
}
