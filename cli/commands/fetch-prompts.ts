import { join } from "path"
import { writeFileSync, mkdirSync } from "fs"
import kleur from "kleur"
import { getChainHome } from "../utils/chain-home"
import { parseBundle } from "../utils/parsers/js-bundle"

export async function runFetchPrompts(): Promise<void> {
  const chainHome = getChainHome()
  const outDir = join(chainHome, "references", "designprompts-dev")
  const outJson = join(outDir, "export.json")
  const sourceUrl = "https://www.designprompts.dev/"

  console.log(kleur.bold("\n🎨 chain fetch-prompts"))

  try {
    const htmlRes = await fetch(sourceUrl)
    if (!htmlRes.ok) throw new Error("Failed to fetch homepage")
    const html = await htmlRes.text()

    const bundleMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/)
    if (!bundleMatch) throw new Error("Could not find bundle JS in HTML")

    const bundleUrl = sourceUrl.replace(/\/$/, "") + bundleMatch[1]
    console.log(kleur.dim(`  Fetching bundle: ${bundleUrl}`))

    const jsRes = await fetch(bundleUrl)
    if (!jsRes.ok) throw new Error("Failed to fetch JS bundle")
    const js = await jsRes.text()

    const styles = parseBundle(js)

    mkdirSync(outDir, { recursive: true })

    const payload = { source: sourceUrl, bundleUrl, styles }
    writeFileSync(outJson, JSON.stringify(payload, null, 2), "utf-8")

    let count = 0
    for (const st of styles) {
      if (!st.id || !st.content) continue
      const name = st.name || st.id
      const body = st.content
      const fm = `---
id: ${st.id}
name: "${name.replace(/"/g, '\\"')}"
source: "${sourceUrl}"
---

`
      writeFileSync(join(outDir, `${st.id}.md`), fm + body.trimEnd() + "\n", "utf-8")
      count++
    }

    console.log(kleur.green(`  ✓ Exported ${count} styles to ${outDir}`))
  } catch (err) {
    console.error(kleur.red(`  ❌ Failed: ${err instanceof Error ? err.message : String(err)}`))
    process.exit(1)
  }
}
