import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import SettingsPage from './page';

afterEach(cleanup);

// Adapted from the preserved original settings test: behavior retained, approved copy/material used.
it('retains all four preference destinations and actual theme/transparency controls', () => {
  render(<SettingsPage />);
  expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  expect(screen.getByRole('link', { name: /AI settings/i })).toHaveAttribute('href', '/settings/ai');
  expect(screen.getByRole('link', { name: /Audio/i })).toHaveAttribute('href', '/settings/audio');
  expect(screen.getByRole('combobox', { name: 'Interface language' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Appearance' })).toBeVisible();
  expect(screen.getByRole('button', { name: /Color theme/ })).toBeEnabled();
  expect(screen.getByRole('checkbox', { name: /Reduce transparency/ })).toBeEnabled();
});
