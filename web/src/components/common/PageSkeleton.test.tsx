import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageSkeleton } from './PageSkeleton';

describe('PageSkeleton', () => {
  it('renders each variant without crashing', () => {
    for (const variant of ['checklist', 'dashboard', 'workspace'] as const) {
      const { container, unmount } = render(<PageSkeleton variant={variant} />);
      expect(container.firstElementChild).toBeTruthy();
      unmount();
    }
  });

  it('merges className', () => {
    const { container } = render(<PageSkeleton className="custom" variant="dashboard" />);
    expect(container.querySelector('.custom')).toBeTruthy();
  });
});
