const toastTransition = "transition-[opacity,transform] duration-[180ms] ease-in-out"

function toastClassForKind(kind) {
  const base = `toast pointer-events-none max-w-[min(22rem,calc(100vw-2rem))] rounded-lg border bg-[rgba(12,15,26,0.96)] px-[0.85rem] py-[0.62rem] text-[0.78rem] leading-[1.45] text-hub-text shadow-[0_10px_32px_rgba(0,0,0,0.4)] backdrop-blur-md ${toastTransition} opacity-0 translate-y-2`
  if (kind === "ok") {
    return `${base} border-[color-mix(in_oklab,var(--color-hub-user)_42%,var(--color-hub-border))]`
  }
  if (kind === "warn") {
    return `${base} border-[color-mix(in_oklab,var(--color-hub-warn)_50%,var(--color-hub-border))] text-[#ffe9c2]`
  }
  return `${base} border-[color-mix(in_oklab,var(--color-hub-err)_45%,var(--color-hub-border))] text-[#ffd6d6]`
}

export function showToast(message, kind) {
  const root = document.querySelector("#toast-root")
  if (!(root instanceof HTMLElement)) return

  const toast = document.createElement("div")
  toast.className = toastClassForKind(kind)
  toast.textContent = message
  root.appendChild(toast)

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.remove("opacity-0", "translate-y-2")
      toast.classList.add("opacity-100", "translate-y-0")
    })
  })

  window.setTimeout(() => {
    toast.classList.remove("opacity-100", "translate-y-0")
    toast.classList.add("opacity-0", "translate-y-1")
    window.setTimeout(() => {
      toast.remove()
    }, 200)
  }, 3200)
}
