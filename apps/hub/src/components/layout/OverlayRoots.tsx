export function OverlayRoots() {
  return (
    <>
      <div
        id="modal-root"
        className="fixed inset-0 z-40 hidden grid place-items-center bg-[rgba(0,0,0,0.58)]"
        aria-hidden="true"
      />
      <div
        id="toast-root"
        className="pointer-events-none fixed right-[max(1rem,env(safe-area-inset-right,0px))] bottom-[max(1rem,env(safe-area-inset-bottom,0px))] z-[10000] flex flex-col items-end gap-[0.45rem]"
        aria-live="polite"
      />
    </>
  )
}
