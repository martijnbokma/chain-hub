import { createContentView } from "./content-view.js"

export function createWorkflowsView(options) {
  return createContentView({
    ...options,
    kind: "workflows",
    title: "Workflows",
  })
}
