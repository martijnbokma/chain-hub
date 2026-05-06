import { createContentView } from "./content-view.js"

export function createRulesView(options) {
  return createContentView({
    ...options,
    kind: "rules",
    title: "Rules",
  })
}
