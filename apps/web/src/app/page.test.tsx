import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from './page';

describe('HomePage', () => {
  it('introduces WorkLingo as the primary page heading', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'WorkLingo' }),
    ).toBeInTheDocument();
  });
});
