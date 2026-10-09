import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import HomePage from './page';

afterEach(cleanup);

describe('HomePage', () => {
  it('introduces WorkLingo as the primary page heading', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'WorkLingo' }),
    ).toBeInTheDocument();
  });

  it('offers both returning and new users a clear next step', () => {
    render(<HomePage />);

    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Create free account' })).toHaveAttribute(
      'href',
      '/register',
    );
  });
});
