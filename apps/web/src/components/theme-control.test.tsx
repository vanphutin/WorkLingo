import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ThemeControl } from './theme-control';
import { THEME_STORAGE_KEY } from '../lib/theme';

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
  localStorage.clear();
  vi.restoreAllMocks();
});

it('cycles through icon themes, persists preference and preserves entered content', () => {
  render(<><ThemeControl /><input aria-label="Draft" defaultValue="My answer" /></>);
  const themeButton = screen.getByRole('button', { name: /color theme: system/i });
  expect(themeButton).toHaveAttribute('title', 'Theme: System');
  fireEvent.click(themeButton);
  expect(screen.getByRole('button', { name: /color theme: light/i })).toBeInTheDocument();
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  fireEvent.click(screen.getByRole('button', { name: /color theme: light/i }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  expect(screen.getByLabelText('Draft')).toHaveValue('My answer');
  fireEvent.click(screen.getByRole('button', { name: /color theme: dark/i }));
  expect(document.documentElement.dataset.theme).toBeUndefined();
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
});

it('still changes theme when storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  render(<ThemeControl />);
  fireEvent.click(screen.getByRole('button', { name: /color theme: system/i }));
  expect(screen.getByRole('button', { name: /color theme: light/i })).toBeInTheDocument();
  expect(document.documentElement.dataset.theme).toBe('light');
});

it('synchronizes preference changes from another tab and restores system after clearing storage', () => {
  render(<ThemeControl />);
  fireEvent(window, new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'light' }));
  expect(screen.getByRole('button', { name: /color theme: light/i })).toBeInTheDocument();
  fireEvent(window, new StorageEvent('storage', { key: null, newValue: null }));
  expect(screen.getByRole('button', { name: /color theme: system/i })).toBeInTheDocument();
});
