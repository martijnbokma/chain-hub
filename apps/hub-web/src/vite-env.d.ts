/// <reference types="vite/client" />

// Fontsource ships CSS-only packages: the "." export resolves to index.css,
// but the bare side-effect import specifier doesn't end in .css, so it can't
// match the ambient `declare module "*.css"` wildcard from vite/client.
declare module "@fontsource-variable/big-shoulders-display";
declare module "@fontsource-variable/inter";
declare module "@fontsource-variable/jetbrains-mono";
