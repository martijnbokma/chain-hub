import { SidebarBrand } from "@/components/layout/SidebarBrand"
import { SidebarNav } from "@/components/layout/SidebarNav"
import { SidebarToggleButton } from "@/components/layout/SidebarToggleButton"
import { StatusPanels } from "@/components/layout/StatusPanels"

export function HubShell({
  children,
  currentRoute = "skills",
}: {
  children?: React.ReactNode
  currentRoute?: string
}) {
  return (
    <div className="app-shell group relative flex min-h-screen items-stretch max-[980px]:block">
      <aside
        id="primary-sidebar"
        className="z-30 flex w-[206px] shrink-0 flex-col self-stretch border-r border-hub-border bg-[rgba(12,15,26,0.93)] backdrop-blur-sm max-[980px]:fixed max-[980px]:top-0 max-[980px]:left-0 max-[980px]:h-screen max-[980px]:max-h-screen max-[980px]:min-h-0 max-[980px]:w-[min(78vw,280px)] max-[980px]:max-w-none max-[980px]:-translate-x-full max-[980px]:self-auto max-[980px]:overflow-y-auto max-[980px]:border-r-hub-border-strong max-[980px]:transition-transform max-[980px]:duration-150 max-[980px]:ease-in-out group-[.sidebar-open]:max-[980px]:translate-x-0"
      >
        <div className="sticky top-0 max-h-screen shrink-0 overflow-y-auto max-[980px]:static max-[980px]:max-h-none max-[980px]:flex-1 max-[980px]:overflow-y-visible">
          <div className="border-b border-hub-border p-4">
            <SidebarBrand />
          </div>
          <SidebarNav currentRoute={currentRoute} />
        </div>
      </aside>
      <button
        id="sidebar-backdrop"
        className="fixed inset-0 z-20 hidden cursor-pointer border-0 bg-[rgba(2,4,10,0.52)] p-0"
        type="button"
        aria-hidden="true"
      />

      <main className="flex min-h-screen min-h-dvh min-w-0 flex-1 flex-col px-[1.2rem] py-[1.05rem] max-[980px]:p-[0.85rem]">
        <header className="mb-[0.85rem] hidden shrink-0 items-center justify-between gap-[0.8rem] border border-hub-border bg-[rgba(12,15,26,0.88)] p-[0.6rem] px-[0.7rem] max-[980px]:flex">
          <div className="min-w-0 flex-1">
            <SidebarBrand />
          </div>
          <SidebarToggleButton />
        </header>
        <StatusPanels />
        <section className="min-w-0">
          {children}
        </section>
      </main>
    </div>
  )
}
