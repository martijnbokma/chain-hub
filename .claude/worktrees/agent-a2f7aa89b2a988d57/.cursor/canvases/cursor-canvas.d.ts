/**
 * Ambient typings for Cursor Canvas host modules so this folder type-checks
 * outside the Cursor canvas runtime (repo-root diagnostics).
 */
declare module "cursor/canvas" {
  /** Minimal placeholder for Cursor-provided canvas primitives. */
  type CanvasComponent = (props: Record<string, unknown>) => unknown;

  export function useHostTheme(): { textAccent: string };

  export const Stack: CanvasComponent;
  export const Grid: CanvasComponent;
  export const H1: CanvasComponent;
  export const H2: CanvasComponent;
  export const Text: CanvasComponent;
  export const Divider: CanvasComponent;
  export const Card: CanvasComponent;
  export const CardHeader: CanvasComponent;
  export const CardBody: CanvasComponent;
}
