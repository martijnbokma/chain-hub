import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"

export function SidebarToggleButton({ 
  onClick, 
  isOpen 
}: { 
  onClick?: () => void
  isOpen?: boolean
}) {
  return (
    <Button
      id="sidebar-toggle"
      type="button"
      size="icon-lg"
      variant="outline"
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border-hub-border-strong bg-[color-mix(in_oklab,var(--color-hub-surface-2)_90%,transparent)] text-[#f3f6ff] transition-[filter,border-color,background-color] duration-[120ms] ease-in-out hover:brightness-110 focus-visible:outline-hub-accent disabled:cursor-not-allowed disabled:opacity-55 disabled:brightness-100"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-controls="primary-sidebar"
      aria-expanded={isOpen}
    >
      <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
      <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
    </Button>
  )
}
