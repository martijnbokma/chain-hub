import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  // Workspace packages aren't published — inline them into the CLI bundle
  // so `npm install -g chain-hub` doesn't need them on the registry.
  noExternal: [/^@chain-hub\//]
});
