import { useState } from 'react';
import { useBlocker } from 'react-router-dom';

import type { AssetKind } from '@/types';

export interface AssetRef {
  kind: AssetKind;
  name: string;
}

/**
 * Guards asset switching and route navigation while the editor has unsaved changes:
 * a pending selection waits for the discard dialog, and useBlocker catches route hops.
 */
export function useUnsavedChangesGuard({
  isDirty,
  selected,
  onSameAsset,
  onSelect
}: {
  isDirty: boolean;
  selected: AssetRef | null;
  onSameAsset: () => void;
  onSelect: (next: AssetRef | null) => void;
}) {
  // `undefined` = no switch pending; `null` = user asked to close the detail panel.
  const [pendingSelection, setPendingSelection] = useState<AssetRef | null | undefined>(undefined);

  // Leaving the Library (sidebar, command palette, back button) would drop the edits too.
  const navigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  function requestSelection(next: AssetRef | null) {
    const sameAsset =
      next !== null && selected !== null && next.kind === selected.kind && next.name === selected.name;
    if (sameAsset) {
      onSameAsset();
      return;
    }
    if (isDirty) {
      setPendingSelection(next);
      return;
    }
    onSelect(next);
  }

  return { pendingSelection, setPendingSelection, requestSelection, navigationBlocker };
}
