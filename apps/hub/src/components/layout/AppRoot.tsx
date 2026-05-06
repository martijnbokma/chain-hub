import { HubShell } from "@/components/layout/HubShell"
import { OverlayRoots } from "@/components/layout/OverlayRoots"
import { PreviewModalShell } from "@/components/layout/PreviewModalShell"

export function AppRoot() {
  return (
    <>
      <HubShell />
      <OverlayRoots />
      <PreviewModalShell />
    </>
  )
}
