import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AppErrorPage } from './AppErrorPage';

function Crash(): never {
  throw new Error('Cannot read properties of undefined');
}

describe('AppErrorPage', () => {
  it('replaces a crashed page with a readable error and a reload action', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const router = createMemoryRouter([{ path: '*', element: <Crash />, errorElement: <AppErrorPage /> }]);

    render(<RouterProvider router={router} />);

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('Cannot read properties of undefined')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
  });
});
