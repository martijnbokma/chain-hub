import { createContentView } from "./content-view.js"

export function createAgentsView(options) {
  return createContentView({
    ...options,
    kind: "agents",
    title: "Agents",
  })
}
