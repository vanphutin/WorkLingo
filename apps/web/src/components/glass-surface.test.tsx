import '@testing-library/jest-dom/vitest';
import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { GlassSurface } from './glass-surface';

afterEach(cleanup);

it('defaults to a regular untinted surface without replacing child navigation semantics', () => {
  render(<GlassSurface data-testid="surface"><nav aria-label="Learning"><a href="/programs">Programs</a></nav></GlassSurface>);
  const surface = screen.getByTestId('surface');
  expect(surface).toHaveAttribute('data-glass-variant', 'regular');
  expect(surface).toHaveAttribute('data-glass-tint', 'none');
  expect(surface).not.toHaveAttribute('role');
  expect(screen.getByRole('navigation', { name: 'Learning' })).toContainElement(screen.getByRole('link', { name: 'Programs' }));
});

it('composes a solid fallback with the caller class, ref and native attributes', () => {
  const ref = createRef<HTMLDivElement>();
  render(<GlassSurface variant="solid" tint="indigo" className="consumer" ref={ref} tabIndex={-1} aria-label="Details">Contents</GlassSurface>);
  expect(ref.current).toHaveClass('glass-surface', 'consumer');
  expect(ref.current).toHaveAttribute('data-glass-variant', 'solid');
  expect(ref.current).toHaveAttribute('data-glass-tint', 'indigo');
  expect(ref.current).toHaveAttribute('tabindex', '-1');
  expect(ref.current).toHaveTextContent('Contents');
});
